import { Controller, Post, Get, Param, Res, Sse, UseGuards, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { User } from './decorators/user.decorator';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly prisma: PrismaService
    ) {}

    @Sse('qr-code/:id')
    async streamQrCode(@Param('id') id: string, @User('id') authenticatedId: string): Promise<Observable<MessageEvent>> {
        if (id !== authenticatedId) {
            throw new UnauthorizedException('You can only access your own QR code');
        }

        try {
            const qrObservable = await this.whatsappService.getQrCodeObservable(id);
            return qrObservable.pipe(
                map(qrData => ({
                    data: {
                        qrCodeDataUrl: qrData.qr,
                        timestamp: qrData.timestamp
                    }
                }) as MessageEvent)
            );
        } catch (error) {
            throw new InternalServerErrorException('Failed to stream QR code', { cause: error });
        }
    }

    @Sse('status/:id')
    async streamStatus(@Param('id') id: string, @User('id') authenticatedId: string): Promise<Observable<MessageEvent>> {
        if (id !== authenticatedId) {
            throw new UnauthorizedException('You can only access your own status');
        }

        try {
            const statusObservable = await this.whatsappService.getStatusObservable(id);
            return statusObservable.pipe(
                map(status => ({ data: { status } }) as MessageEvent)
            );
        } catch (error) {
            throw new InternalServerErrorException('Failed to stream status', { cause: error });
        }
    }

    @Post('close/:id')
    async closeSocket(@Param('id') id: string, @User('id') authenticatedId: string, @Res() res: Response) {
        if (id !== authenticatedId) {
            throw new UnauthorizedException('You can only close your own socket');
        }

        try {
            await this.whatsappService.closeSocket(id);
            res.status(200).json({ message: 'Socket closed successfully.' });
        } catch (error) {
            if (error instanceof NotFoundException) {
                res.status(404).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Failed to close socket.', error: error.message });
            }
        }
    }

    @Get('instance/:id')
    async getInstanceStatus(@Param('id') id: string, @User('id') authenticatedId: string) {
        if (id !== authenticatedId) {
            throw new UnauthorizedException('You can only access your own instance status');
        }

        try {
            const instance = await this.prisma.instance.findUnique({
                where: { id },
                select: { status: true, phone: true }
            });

            if (!instance) {
                throw new NotFoundException('Instance not found');
            }

            return instance;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            } else {
                throw new InternalServerErrorException('Failed to fetch instance status', { cause: error });
            }
        }
    }
}