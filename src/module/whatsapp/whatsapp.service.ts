import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import makeWASocket, { ConnectionState, WASocket, DisconnectReason } from '@whiskeysockets/baileys';
import { useRedisAuthState } from 'redis-baileys';
import { ConfigService } from '@nestjs/config';
import * as qrcode from 'qrcode';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { Instance } from '@prisma/client';
import { Subject, Observable } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface QrCodeData {
    qr: string;
    timestamp: number;
}

interface SocketData {
    socket: WASocket;
    qrSubject: Subject<QrCodeData>;
    statusSubject: Subject<string>;
}

@Injectable()
export class WhatsappService {
    private sockets = new Map<string, SocketData>();
    private explicitlyClosedSockets = new Set<string>();

    private readonly redisConfig = {
        password: this.configService.get<string>('REDIS_PASSWORD'),
        host: this.configService.get<string>('REDIS_HOST'),
        port: this.configService.get<number>('REDIS_PORT'),
    };

    private readonly logger = new Logger(WhatsappService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2
    ) { }

    async getOrCreateSocket(id: string): Promise<SocketData> {
        if (this.sockets.has(id)) {
            return this.sockets.get(id);
        }

        const { state, saveCreds } = await this.getAuthState(id);
        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            mobile: false,
        });

        const qrSubject = new Subject<QrCodeData>();
        const statusSubject = new Subject<string>();

        const socketData: SocketData = { socket, qrSubject, statusSubject };
        this.sockets.set(id, socketData);

        socket.ev.on('creds.update', saveCreds);
        socket.ev.on('connection.update', (update: Partial<ConnectionState>) =>
            this.handleConnectionUpdate(id, update)
        );

        const userId = await this.getUserIdForInstance(id); // Assuming you have a method to get the userId
        await this.createOrUpdateInstance(id, socket.user?.id, userId);

        return socketData;
    }

    private async getUserIdForInstance(id: string): Promise<string> {
        try {
            const instance = await this.prisma.instance.findUnique({
                where: { id },
                select: { userId: true },
            });
            if (!instance || !instance.userId) {
                throw new NotFoundException(`No user found for instance id: ${id}`);
            }
            return instance.userId;
        } catch (error) {
            this.logger.error(`Failed to get userId for instance id: ${id}`, error);
            throw new InternalServerErrorException('Failed to get userId for instance', { cause: error });
        }
    }


    private async getAuthState(id: string) {
        return useRedisAuthState(this.redisConfig, id);
    }

    private async handleConnectionUpdate(id: string, update: Partial<ConnectionState>) {
        const socketData = this.sockets.get(id);
        if (!socketData) {
            this.logger.warn(`No socket data found for id: ${id}`);
            return;
        }

        if (update.qr) {
            try {
                const qrCodeDataUrl = await qrcode.toDataURL(update.qr);
                socketData.qrSubject.next({ qr: qrCodeDataUrl, timestamp: Date.now() });
            } catch (error) {
                this.logger.error(`Failed to generate QR code for id: ${id}`, error);
            }
        }

        if (update.connection === 'close') {
            const shouldReconnect =
                (update.lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
                && !this.explicitlyClosedSockets.has(id);

            if (shouldReconnect) {
                await this.reconnectSocket(id);
            } else {
                await this.updateInstanceStatus(id, 'offline');
                socketData.statusSubject.next('offline');
            }
        } else if (update.connection === 'open') {
            this.logger.log(`Opened connection for id: ${id}`);
            await this.updateInstanceStatus(id, 'online');
            socketData.statusSubject.next('online');
        }

        this.eventEmitter.emit('whatsapp.connection.update', { id, status: update.connection });
    }

    private async updateInstanceStatus(id: string, status: 'online' | 'offline') {
        try {
            await this.prisma.instance.update({
                where: { id },
                data: { status },
            });
        } catch (error) {
            this.logger.error(`Failed to update instance status for id: ${id}`, error);
        }
    }

    private async reconnectSocket(id: string) {
        this.logger.log(`Reconnecting socket for id: ${id}`);
        const socketData = this.sockets.get(id);
        if (!socketData) {
            throw new NotFoundException(`No socket found for id: ${id}. Cannot reconnect.`);
        }

        try {
            await socketData.socket.end(new Error(`Reconnecting socket for id: ${id}`));
            this.sockets.delete(id);
            await this.getOrCreateSocket(id);
            this.logger.log(`Reconnected socket for id: ${id}`);
        } catch (error) {
            this.logger.error(`Failed to reconnect socket for id: ${id}`, error);
            throw new InternalServerErrorException('Failed to reconnect socket', { cause: error });
        }
    }

    async closeSocket(id: string): Promise<void> {
        const socketData = this.sockets.get(id);
        if (!socketData) {
            throw new NotFoundException(`No socket found for id: ${id}. Cannot close.`);
        }

        try {
            await socketData.socket.end(new Error(`Closing socket for id: ${id}`));
            this.sockets.delete(id);
            this.explicitlyClosedSockets.add(id);

            await this.updateInstanceStatus(id, 'offline');
            socketData.statusSubject.next('offline');
            socketData.statusSubject.complete();
            socketData.qrSubject.complete();
        } catch (error) {
            this.logger.error(`Failed to close socket for id: ${id}`, error);
            throw new InternalServerErrorException('Failed to close socket', { cause: error });
        }
    }

    private async createOrUpdateInstance(id: string, number: string, userId: string): Promise<Instance> {
        const phoneNumber = number?.split('@s.whatsapp.net')[0];
        try {
            return await this.prisma.instance.upsert({
                where: { id },
                update: { phone: phoneNumber, status: 'offline' },
                create: {
                    id,
                    phone: phoneNumber,
                    username: `instance_${id}`,
                    status: 'offline',
                    userId,
                },
            });
        } catch (error) {
            this.logger.error(`Failed to create or update instance for id: ${id}`, error);
            throw new InternalServerErrorException('Failed to create or update instance', { cause: error });
        }
    }

    async getQrCodeObservable(id: string): Promise<Observable<QrCodeData>> {
        const socketData = await this.getOrCreateSocket(id);
        return socketData.qrSubject.asObservable();
    }

    async getStatusObservable(id: string): Promise<Observable<string>> {
        const socketData = await this.getOrCreateSocket(id);
        return socketData.statusSubject.asObservable();
    }
}