import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
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
  ],
  providers: [WhatsappService, PrismaService, EventEmitter2],
  controllers: [WhatsappController],
  exports: [WhatsappService]
})
export class WhatsappModule {}
