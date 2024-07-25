import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { UserRepository } from 'src/repositories/user.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
        ConfigModule.forRoot(),
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, PrismaService, UserRepository],
})
export class AuthModule {}
