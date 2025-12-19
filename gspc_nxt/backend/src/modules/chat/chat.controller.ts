import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendMessage(
    @Body('fromId') fromId: number,
    @Body('toId') toId: number,
    @Body('message') message: string,
  ) {
    await this.chatService.sendMessage(fromId, toId, message);
    return { success: true };
  }

  @Get('sync_read_receipts')
  async syncReadReceipts(@Query('userId') userId: string) {
    const currentUserId = Number(userId);
    return { success: true, receipts: await this.chatService.syncReadReceipts(currentUserId) };
  }

  @Post('mark_read')
  async markRead(
    @Body('userId') userId: number,
    @Body('peerId') peerId: number,
    @Body('lastReadMsgId') lastReadMsgId: number,
  ) {
    await this.chatService.markRead(userId, peerId, lastReadMsgId);
    return { success: true };
  }

  @Get('retrieve')
  async retrieveMessages(
    @Query('userId') userId: string,
    @Query('toId') toId: string,
    @Query('beforeId') beforeId?: string,
    @Query('limit') limit?: string,
  ) {
    const currentUserId = Number(userId);
    const targetId = Number(toId);
    const before = beforeId ? Number(beforeId) : 0;
    const cappedLimit = limit ? Number(limit) : 50;
    return this.chatService.retrieveMessages(currentUserId, targetId, before, cappedLimit);
  }
}
