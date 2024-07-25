import { Module } from '@nestjs/common';
import { envValidationSchema } from './env.validation';
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './module/auth/auth.module';
import { WhatsappModule } from './module/whatsapp/whatsapp.module';
import { MessageModule } from './module/messaging/message.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: envValidationSchema,
            isGlobal: true, // Make the ConfigService globally available
        }),
        AuthModule,
        WhatsappModule,
        MessageModule
    ],
})

export class AppModule { }
