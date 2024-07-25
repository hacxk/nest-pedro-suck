import { Injectable, UnauthorizedException } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AnyMessageContent } from '@whiskeysockets/baileys';
import { SendMessageDto } from './dto/send-message.dto';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

interface SendMessageResult {
  status: string;
  info?: any;
}

interface SendMessageErrorResult {
  error: string;
}

type SendMessageResponse = SendMessageResult | SendMessageErrorResult;


@Injectable()
export class MessagingService {
  constructor(
    private whatsappService: WhatsappService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    @InjectQueue('message-queue') private messageQueue: Queue
  ) { }

  async sendMessage(token: string, Jid: string, message: AnyMessageContent): Promise<SendMessageResponse> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
      });
      if (!user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }
      const socket = await this.whatsappService.getOrCreateSocket(user.id);
      if (!socket || !socket.socket) {
        throw new Error(`Socket not found or not connected for ${user.email}`);
      }
      const messageStatus = await socket.socket.sendMessage(Jid, message);
  
      await this.prisma.message.create({
        data: {
          content: JSON.stringify(message),
          status: 'sent',
          userId: user.id
        }
      });
  
      return { status: "Success!", info: messageStatus };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return { error: error.message };
      } else {
        await this.messageQueue.add('retry-message', {
          token,
          Jid,
          message,
          attempts: 0
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
  
        await this.prisma.message.create({
          data: {
            content: JSON.stringify(message),
            status: 'failed',
            userId: JSON.parse(atob(token.split('.')[1])).sub
          }
        });
  
        return { error: 'An error occurred while sending the message. It will be retried.' + error.message };
      }
    }
  }
  
  convertToAnyMessageContent(message: SendMessageDto['message']): AnyMessageContent {
    if ('text' in message) {
      return { text: message.text };
    }
    throw new Error('Invalid message format');
  }

  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    const messageIdNumber = parseInt(messageId, 10); // Convert messageId to a number
    await this.prisma.message.update({
      where: { id: messageIdNumber },
      data: { status },
    });
  }
}
