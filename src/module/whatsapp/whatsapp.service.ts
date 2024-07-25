import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import makeWASocket, { ConnectionState, WASocket, DisconnectReason, BaileysEventEmitter } from '@whiskeysockets/baileys';
import { useRedisAuthState } from 'redis-baileys';
import { ConfigService } from '@nestjs/config';
import * as qrcode from 'qrcode';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Instance } from '@prisma/client';

interface GetQrCodeParams {
    email: string;
}

@Injectable()
export class WhatsappService {
    private sockets = new Map<string, WASocket>();
    private qrCodes = new Map<string, { qr: string; timestamp: number }>();
    private eventEmitters = new Map<string, BaileysEventEmitter>();
    private socketStatus = new Map<string, 'online' | 'offline'>();
    private explicitlyClosedSockets = new Set<string>();

    private readonly redisConfig = {
        password: this.configService.get<string>('REDIS_PASSWORD'),
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
    };

    private readonly logger = new Logger(WhatsappService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {}

    private async createSocket(email: string): Promise<WASocket | string> {
        if (this.sockets.has(email) && this.socketStatus.get(email) === 'online') {
            return 'Already Socket Created!';
        }

        const { state, saveCreds } = await this.getAuthState(email);
        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            mobile: false,
        });

        await this.createInstanceForUser(email, socket.user.id);
        this.sockets.set(email, socket);
        this.eventEmitters.set(email, socket.ev);
        this.socketStatus.set(email, 'offline');

        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('connection.update', (update: Partial<ConnectionState>) =>
            this.handleConnectionUpdate(email, update)
        );

        return socket;
    }

    private async getAuthState(email: string) {
        return useRedisAuthState(this.redisConfig, email);
    }

    private async handleConnectionUpdate(email: string, update: Partial<ConnectionState>) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return;

        const instance = await this.prisma.instance.findFirst({ where: { userId: user.id } });
        if (!instance) return;

        if (update.qr) {
            const qrCodeDataUrl = await qrcode.toDataURL(update.qr);
            this.qrCodes.set(email, { qr: qrCodeDataUrl, timestamp: Date.now() });
        }

        if (update.connection === 'close') {
            const shouldReconnect = 
                (update.lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
                && !this.explicitlyClosedSockets.has(email);

            if (shouldReconnect) {
                await this.reconnectSocket(email);
            }

            await this.updateInstanceStatus(email, 'offline');
            this.socketStatus.set(email, 'offline');
        } else if (update.connection === 'open') {
            this.logger.log(`Opened connection for ${email}`);
            await this.updateInstanceStatus(email, 'online');
            this.socketStatus.set(email, 'online');
        }
    }

    private async updateInstanceStatus(email: string, status: 'online' | 'offline') {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) throw new NotFoundException('User not found');

        const instance = await this.prisma.instance.findFirst({ where: { userId: user.id } });
        if (!instance) throw new NotFoundException('Instance not found');

        await this.prisma.instance.update({
            where: { id: instance.id },
            data: { status },
        });
    }

    private async reconnectSocket(email: string) {
        this.logger.log(`Reconnecting socket for ${email}...`);
        const socket = this.sockets.get(email);
        if (!socket) {
            throw new NotFoundException(`No socket found for ${email}. Cannot reconnect.`);
        }

        try {
            await socket.end(new Error(`Reconnecting socket for ${email}...`));
            this.sockets.delete(email);
            this.eventEmitters.delete(email);
            this.socketStatus.set(email, 'offline');
            await this.createSocket(email);
            this.logger.log(`Reconnected socket for ${email}`);
        } catch (error) {
            this.logger.error(`Failed to reconnect socket for ${email}`, error);
            throw new InternalServerErrorException('Failed to reconnect socket', { cause: error });
        }
    }

    async getQrCode(params: GetQrCodeParams): Promise<{ qrCodeDataUrl?: string; success: boolean; message: string }> {
        const { email } = params;
        const qrData = this.qrCodes.get(email);

        if (qrData && Date.now() - qrData.timestamp < 60000) {
            return { qrCodeDataUrl: qrData.qr, success: true, message: "QR Code already generated!" };
        }

        try {
            const existingSocketResponse = await this.createSocket(email);
            if (typeof existingSocketResponse === 'string') {
                return { qrCodeDataUrl: undefined, success: false, message: existingSocketResponse };
            }

            const socket = existingSocketResponse;
            let qrCodeDataUrl: string | undefined;
            let connectionOpened = false;

            const handleQr = async (update: Partial<ConnectionState>) => {
                if (update.qr) {
                    try {
                        qrCodeDataUrl = await qrcode.toDataURL(update.qr);
                        socket.ev.off('connection.update', handleQr);
                    } catch (err) {
                        this.logger.error('Failed to generate QR code data URL.', err);
                    }
                } else if (update.connection === 'open') {
                    connectionOpened = true;
                    await this.updateInstanceStatus(email, 'online');
                    socket.ev.off('connection.update', handleQr);
                }
            };

            socket.ev.on('connection.update', handleQr);

            const response = await new Promise<{ qrCodeDataUrl?: string; success: boolean; message: string }>(
                (resolve, reject) => {
                    const timeout = setTimeout(() => {
                        socket.ev.off('connection.update', handleQr);
                        if (!qrCodeDataUrl && !connectionOpened) {
                            reject(new Error('Failed to receive QR code and connection not opened.'));
                        } else {
                            resolve({
                                qrCodeDataUrl,
                                success: true,
                                message: qrCodeDataUrl ? "QR code generated successfully!" : "Connection opened successfully!",
                            });
                        }
                    }, 60000);
                }
            );

            return response;

        } catch (error) {
            this.logger.error('Failed to initialize socket or handle QR code.', error);
            throw new InternalServerErrorException('Failed to initialize socket or handle QR code.', { cause: error });
        }
    }

    private async createInstanceForUser(email: string, number: string): Promise<Instance> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        let instance = await this.prisma.instance.findFirst({ where: { userId: user.id } });
        if (instance) {
            return instance;
        }
        try {
            return await this.prisma.instance.create({
                data: {
                    phone: number.split('@s.whatsapp.net')[0],
                    username: `instance_${user.id}`,
                    status: 'offline',
                    user: { connect: { id: user.id } },
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return null;
            } else {
                throw error;
            }
        }
    }

    async closeSocket(email: string): Promise<void> {
        const socket = this.sockets.get(email);
        if (!socket) {
            throw new NotFoundException(`No socket found for ${email}. Cannot close.`);
        }

        try {
            await socket.end(new Error(`Closing socket for ${email}...`));
            this.sockets.delete(email);
            this.eventEmitters.delete(email);
            this.socketStatus.set(email, 'offline');
            this.explicitlyClosedSockets.add(email);
            const user = await this.prisma.user.findUnique({ where: { email } });
            if (user) {
                const instance = await this.prisma.instance.findFirst({ where: { userId: user.id } });
                if (instance) {
                    await this.prisma.instance.update({
                        where: { id: instance.id },
                        data: { status: 'offline' },
                    });
                }
            }
        } catch (error) {
            this.logger.error(`Failed to close socket for ${email}`, error);
            throw new InternalServerErrorException('Failed to close socket', { cause: error });
        }
    }
}
