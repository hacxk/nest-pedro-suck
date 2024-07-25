import { IsString, IsNotEmpty, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class TextMessage {
  @IsString()
  @IsNotEmpty()
  text: string;
}

class MediaMessage {
  @IsString()
  @IsNotEmpty()
  type: 'image' | 'video' | 'audio' | 'document';

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  jid: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object, {
    discriminator: {
      property: '__type',
      subTypes: [
        { value: TextMessage, name: 'text' },
        { value: MediaMessage, name: 'media' },
      ],
    },
  })
  message: TextMessage | MediaMessage;
}