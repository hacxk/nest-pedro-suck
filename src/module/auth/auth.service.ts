import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRepository } from '../../repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly jwtService: JwtService
    ) {}

    async signup(createUserDto: CreateUserDto) {
        const userDto = plainToInstance(CreateUserDto, createUserDto);
        const errors = await validate(userDto);
        if (errors.length > 0) {
            const errorMessages = errors.map(err => `${err.property}: ${Object.values(err.constraints).join(', ')}`);
            throw new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`);
        }
        if (userDto.password !== userDto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }
        const existingUser = await this.userRepository.findByEmail(userDto.email);
        if (existingUser) {
            throw new BadRequestException('Email already in use');
        }
        const hashedPassword = await hash(userDto.password, 10);
        const newUser = await this.userRepository.create({
            ...userDto,
            password: hashedPassword,
        });
        return { message: 'User registered successfully', user: newUser };
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.userRepository.findByEmail(email);
        if (!user || !(await compare(password, user.password))) {
            return null;
        }
        return user;
    }

    async login(loginUserDto: LoginUserDto) {
        const loginDto = plainToInstance(LoginUserDto, loginUserDto);
        const errors = await validate(loginDto);
        if (errors.length > 0) {
            const errorMessages = errors.map(err => `${err.property}: ${Object.values(err.constraints).join(', ')}`);
            throw new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`);
        }
        const payload = { email: loginDto.email, sub: loginDto.password };
        const token = this.jwtService.sign(payload);
        return { message: 'Login successful', token };
    }
}
