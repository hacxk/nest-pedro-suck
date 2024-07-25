import { Controller, Post, Body, Param, HttpCode, HttpStatus, ValidationPipe } from "@nestjs/common";
import { MessagingService } from "./message.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { AnyMessageContent } from "@whiskeysockets/baileys";

@Controller('instant-messaging')
export class MessageController {
  constructor(private readonly messagingService: MessagingService) { }

  @Post(':token')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @Param('token') token: string,
    @Body(ValidationPipe) messageData: SendMessageDto
  ): Promise<{ success: boolean; message: string } | object> {
    try {
      const content: AnyMessageContent = this.convertToAnyMessageContent(messageData.message);
      return await this.messagingService.sendMessage(token, messageData.jid, content);
    } catch (error) {
      return { success: false, message: 'Failed to send message' };
    }
  }

  private convertToAnyMessageContent(message: SendMessageDto['message']): AnyMessageContent {
    if ('text' in message) {
      return { text: message.text };
    }
    throw new Error('Invalid message format');
  }
}
