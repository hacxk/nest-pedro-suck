import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
        BullModule.forRoot({
            connection: {
                host: 'localhost',
                port: 6379,
            },
        }),
        AuthModule,
        WhatsappModule,
        MessageModule
    ],
})
export class AppModule { }
