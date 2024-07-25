import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, Query, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { instanceDto } from './dto/instanceDto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Controller('whatsapp')
export class WhatsappController {
    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService
    ) { }

    @Post('auth')
    @HttpCode(HttpStatus.OK)
    async authenticate(@Body() instanceData: instanceDto, @Res() res: Response) {
        try {
            const payload = await this.jwtService.verifyAsync(instanceData.token, {
                secret: process.env.JWT_SECRET
            });
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();
            const { qrCodeDataUrl, success, message } = await this.whatsappService.getQrCode({ email: user.email }); // Use user's email from DB
            if (message) {
                res.status(HttpStatus.OK).json({ message, success });
            } else {
                res.status(success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json({ qrCodeDataUrl, message: success ? '' : 'Failed to generate QR code' });
            }
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
        }
    }

    @Get('auth/status/:email')
    async getConnectionStatus(@Param('email') email: string) {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        const instance = await this.prisma.instance.findFirst({
            where: { userId: user.id },
            include: { user: true }
        });
        if (!instance) {
            throw new NotFoundException('Instance not found');
        }
        return { status: instance.status };
    }

    @Post('instance-close')
    @HttpCode(HttpStatus.OK)
    async closeSocket(@Body() { email, token }: { email: string; token: string }, @Res() res: Response) {
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            });
            const user = await this.prisma.user.findUnique({ where: { email } });
            if (!user || user.id !== payload.sub) {
                throw new UnauthorizedException();
            }
            await this.whatsappService.closeSocket(email); // Use the public method
            res.status(HttpStatus.OK).json({ message: 'Socket closed successfully.' });
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token or socket closure failed.' });
        }
    }
}
