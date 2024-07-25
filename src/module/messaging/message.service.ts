import { Injectable, UnauthorizedException } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service'; // Import PrismaService
import { AnyMessageContent } from '@whiskeysockets/baileys';

@Injectable()
export class MessagingService {
  constructor(
    private whatsappService: WhatsappService,
    private jwtService: JwtService,
    private prisma: PrismaService // Inject PrismaService
  ) {}

  async sendMessage(token: string, Jid: string, message: AnyMessageContent): Promise<Object> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub } // Assuming payload has 'sub' as user ID
      });
      if (!user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }
      const socket = this.whatsappService.getSocket(user.email);
      if (!socket || !socket.user) {
        throw new Error(`Socket not found or not connected for ${user.email}`);
      }

      
      const messageStatus = await socket.sendMessage(Jid, message); // Pass 'message' directly
      return { status: "Success!", info: messageStatus };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return { error: error.message }; // Return a structured error
      } else {
        return { error: 'An error occurred while sending the message' + error }; // Generic error
      }
    }
  }
}
