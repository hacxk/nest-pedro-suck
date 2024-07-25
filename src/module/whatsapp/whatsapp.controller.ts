import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
    ) {}

    @Post('auth')
    @HttpCode(HttpStatus.OK)
    async authenticate(@Body() instanceData: instanceDto, @Res() res: Response) {
        try {
            const payload = await this.jwtService.verifyAsync(instanceData.token, {
                secret: process.env.JWT_SECRET
            });

            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();

            const { qrCodeDataUrl, success } = await this.whatsappService.getQrCode({ email: user.email }); // Use user's email from DB
            
            res.status(success ? HttpStatus.OK : HttpStatus.INTERNAL_SERVER_ERROR).json({ qrCodeDataUrl, message: success ? '' : 'Failed to generate QR code' });
        } catch (error) {
            res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
        }
    }

    @Get('auth/status/:email')
    async getConnectionStatus(@Param('email') email: string) {
        const instance = await this.prisma.instance.findFirst({ 
            where: { user: { email } }, 
            include: { user: true } // Include the user object to access email
        });

        if (!instance) throw new NotFoundException('Instance not found');
        return { status: instance };
    }
}
