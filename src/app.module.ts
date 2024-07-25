import { Module } from '@nestjs/common';
import { envValidationSchema } from './env.validation';
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './module/auth/auth.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: envValidationSchema,
            isGlobal: true, // Make the ConfigService globally available
        }),
        AuthModule
    ],
})

export class AppModule { }
