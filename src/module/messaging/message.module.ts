import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessagingService } from "./message.service";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MessageQueueProcessor } from "./queue/message.queue ";
import { BullModule } from "@nestjs/bullmq";

@Module({
    imports: [
        WhatsappModule,
        EventEmitterModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
        BullModule.registerQueue({
            name: 'message-queue',
        }),
    ],
    controllers: [MessageController],
    providers: [MessagingService, PrismaService, MessageQueueProcessor]
})

export class MessageModule { };