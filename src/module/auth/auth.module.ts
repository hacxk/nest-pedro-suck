import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserRepository } from "src/repositories/user.repository";
import { JwtModule } from "@nestjs/jwt"; // Import JwtModule
import { ConfigModule, ConfigService } from "@nestjs/config"; // For configuration management

@Module({
    imports: [
        JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'), // Load secret from environment variables
            signOptions: { expiresIn: '1h' }, // Configure JWT expiration
        }),
    }),],
    controllers: [AuthController],
    providers: [AuthService, PrismaService, UserRepository],
})
export class AuthModule { }
