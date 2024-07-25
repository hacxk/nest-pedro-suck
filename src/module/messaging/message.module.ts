import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { MessageController } from './message.controller';
import { MessagingService } from './message.service';
import { MessageQueueProcessor } from './queue/message.queue ';

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
        BullModule.forRootAsync({ // Register using forRootAsync
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host: configService.get('REDIS_HOST'),
                    port: +configService.get('REDIS_PORT'),
                    password: configService.get('REDIS_PASSWORD'),
                },
            }),
        }),
        BullModule.registerQueue({ // Register the queue
            name: 'message-queue', 
        }),
    ],
    controllers: [MessageController],
    providers: [MessagingService, PrismaService, MessageQueueProcessor],
})
export class MessageModule {}
