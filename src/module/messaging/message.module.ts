import { Module } from "@nestjs/common";
import { MessageController } from "./message.controller";
import { MessagingService } from "./message.service";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Module({
    imports: [
        WhatsappModule,
        ConfigModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
              secret: configService.get<string>('JWT_SECRET'),
              signOptions: { expiresIn: '24h' },
          }),
      }),
      ],
    controllers: [MessageController],
    providers: [MessagingService, PrismaService]
})

export class MessageModule {};