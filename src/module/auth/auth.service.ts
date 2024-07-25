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
        if (userDto.password !== userDto.confirmpassword) {
            throw new BadRequestException('Passwords do not match');
        }
        const existingUser = await this.userRepository.findByEmail(userDto.email);
        if (existingUser) {
            throw new BadRequestException('Email already in use');
        }
        try {
            const hashedPassword = await hash(createUserDto.password, 10);
            const newUser = await this.userRepository.create({
                ...createUserDto,
                password: hashedPassword,
            });
            return { message: 'User registered successfully', user: newUser };
        } catch (error) {
            if (error.code === 'P2002') {
                throw new BadRequestException('User already exists');
            } else {
                throw new BadRequestException('Signup failed. Please try again later.');
            }
        }
    }

    async validateUser(email: string, password: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isValidPassword = await compare(password, user.password);
        if (!isValidPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }

    async login(loginUserDto: LoginUserDto) {
        const userDto = plainToInstance(LoginUserDto, loginUserDto);
        const errors = await validate(userDto);
        if (errors.length > 0) {
            const errorMessages = errors.map(err => `${err.property}: ${Object.values(err.constraints).join(', ')}`);
            throw new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`);
        }
        const user = await this.validateUser(userDto.email, userDto.password);
        const payload = { email: user.email, sub: user.id };
        const token = this.jwtService.sign(payload);
        return { message: 'Login successful', token };
    }
}
