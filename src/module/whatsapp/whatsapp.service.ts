import { Injectable, Logger } from '@nestjs/common';
import makeWASocket, { ConnectionState, WASocket, DisconnectReason, BaileysEventEmitter, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { useRedisAuthState } from 'redis-baileys';
import { ConfigService } from '@nestjs/config';
import qrcode from 'qrcode';
import Boom from '@hapi/boom';
import { PrismaService } from 'src/shared/prisma/prisma.service';

interface GetQrCodeParams { email: string; }

@Injectable()
export class WhatsappService {
    private sockets: Map<string, WASocket> = new Map();
    private qrCodes: Map<string, { qr: string, timestamp: number }> = new Map();
    private eventEmitters: Map<string, BaileysEventEmitter> = new Map();

    private readonly redisConfig = {
        password: this.configService.get<string>('REDIS_PASSWORD'),
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
    };

    private readonly logger = new Logger(WhatsappService.name);

    constructor(private readonly configService: ConfigService, private prisma: PrismaService) { }

    private async createSocket(email: string): Promise<WASocket> {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await this.getAuthState(email);

        const socket = makeWASocket({ auth: state, printQRInTerminal: false, mobile: false, version });

        this.sockets.set(email, socket);
        this.eventEmitters.set(email, socket.ev);

        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('connection.update', (update: Partial<ConnectionState>) => this.handleConnectionUpdate(email, update));

        return socket;
    }

    private async getAuthState(email: string) {
        return useRedisAuthState(this.redisConfig, email);
    }

    private async handleConnectionUpdate(email: string, update: Partial<ConnectionState>) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) return;

        if (update.qr) {
            const qrCodeDataUrl = await qrcode.toDataURL(update.qr);
            this.qrCodes.set(email, { qr: qrCodeDataUrl, timestamp: Date.now() });
        }

        if (update.connection === 'close') {
            if (this.shouldReconnect(update.lastDisconnect)) {
                this.reconnectSocket(email);
            }
        }
    }

    private shouldReconnect(lastDisconnect?: { error?: Error; date: Date }) {
        if (lastDisconnect && lastDisconnect.error) {
            const errorReason = lastDisconnect.error.name as unknown as DisconnectReason;
            return ![DisconnectReason.loggedOut, DisconnectReason.restartRequired].includes(errorReason);
        }
        return true;
    }

    private async reconnectSocket(email: string) {
        const socket = this.sockets.get(email);
        if (socket) {
            await socket.logout();
            await this.createSocket(email);
        } else {
            throw Boom.notFound(`No socket found for ${email}. Cannot reconnect.`);
        }
    }

    async getQrCode(params: GetQrCodeParams): Promise<{ qrCodeDataUrl: string, success: boolean }> {
        const qrData = this.qrCodes.get(params.email);
        if (qrData && Date.now() - qrData.timestamp < 60000) { // QR code valid for 1 minute
            return { qrCodeDataUrl: qrData.qr, success: true };
        }

        try {
            await this.createSocket(params.email);
            const { qrCodeDataUrl, success } = await new Promise<{ qrCodeDataUrl: string, success: boolean }>((resolve) => {
                this.eventEmitters.get(params.email)?.on('connection.update', (update: Partial<ConnectionState>) => {
                    if (update.qr) {
                        qrcode.toDataURL(update.qr).then(qrCodeDataUrl => resolve({ qrCodeDataUrl, success: true }));
                    } else {
                        resolve({ qrCodeDataUrl: '', success: false });
                    }
                });
            });
            return { qrCodeDataUrl, success };

        } catch (error) {
            this.logger.error('Failed to initialize socket or handle QR code.', error);
            throw Boom.internal('Failed to initialize socket or handle QR code.', error);
        }
    }
}
