import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UserRepository } from "../../repositories/user.repository"; // Assume this is a custom repository
import { JwtService } from "@nestjs/jwt";
import { hash, compare } from "bcrypt";

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
    
    

    async login(loginUserDto: LoginUserDto) {
        const loginDto = plainToInstance(LoginUserDto, loginUserDto);
        const errors = await validate(loginDto);

        if (errors.length > 0) {
            const errorMessages = errors.map(err => `${err.property}: ${Object.values(err.constraints).join(', ')}`);
            throw new BadRequestException(`Validation failed: ${errorMessages.join(', ')}`);
        }

        const user = await this.userRepository.findByEmail(loginDto.email);
        if (!user || !(await compare(loginDto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { email: user.email, sub: user.id };
        const token = this.jwtService.sign(payload);

        return { message: 'Login successful', token };
    }
}
