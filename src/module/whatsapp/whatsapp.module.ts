import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '24h' },
      }),
  }),
  ],
  providers: [WhatsappService, PrismaService],
  controllers: [WhatsappController],
  exports: [WhatsappService]
})
export class WhatsappModule {}
