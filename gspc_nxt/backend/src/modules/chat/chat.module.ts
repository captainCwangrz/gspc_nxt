import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphEventsModule } from '../events/graph-events.module';
import { Relationship } from '../relationships/relationship.entity';
import { User } from '../users/user.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Message } from './message.entity';
import { ReadReceipt } from './read-receipt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Relationship, ReadReceipt, User]),
    GraphEventsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
