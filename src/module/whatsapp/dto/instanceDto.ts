import { IsEmail, IsString } from "class-validator";

export class instanceDto {
    @IsString()
    @IsEmail()
    email: string;

    @IsString()
    token: string;
}