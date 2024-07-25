import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { envValidationSchema } from './env.validation';
import { AuthModule } from './module/auth/auth.module';
import { WhatsappModule } from './module/whatsapp/whatsapp.module';
import { MessageModule } from './module/messaging/message.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: envValidationSchema,
            isGlobal: true,
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                connection: {
                    host: configService.get('REDIS_HOST'),
                    port: +configService.get('REDIS_PORT'),
                    password: configService.get('REDIS_PASSWORD'),
                },
            }),
            inject: [ConfigService],
        }),
        AuthModule,
        WhatsappModule,
        MessageModule
    ],
})
export class AppModule { }
