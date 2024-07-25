import { Injectable } from "@nestjs/common";
import { PrismaService } from "../shared/prisma/prisma.service"; // Ensure you have PrismaService
import { User, Prisma } from "@prisma/client";

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async create(userData: Omit<Prisma.UserCreateInput, 'confirmPassword'>): Promise<User> {
        return this.prisma.user.create({
            data: {
                username: userData.username,
                email: userData.email,
                password: userData.password,
            },
        });
    }


    async updateLastLogin(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { lastLogin: new Date() },
        });
    }
}
