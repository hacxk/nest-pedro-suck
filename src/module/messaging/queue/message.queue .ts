import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MessagingService } from '../message.service';

@Processor('message-queue')
export class MessageQueueProcessor extends WorkerHost {
  constructor(private messagingService: MessagingService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { token, Jid, message, attempts } = job.data;

    try {
      const result = await this.messagingService.sendMessage(token, Jid, message);

      if ('error' in result) {
        throw new Error(result.error); // Access the 'error' property from result
      }

      return result;
    } catch (error) {
      if (attempts >= 3) {
        const jobId = job.id as string; // Assert job.id is a string
        await this.messagingService.updateMessageStatus(jobId, 'permanently_failed');
        throw new Error('Max retry attempts reached. Message sending permanently failed.');
      }
      throw error;
    }
  }
}
