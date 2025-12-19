import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GraphEventsService } from '../events/graph-events.service';
import { Relationship } from '../relationships/relationship.entity';
import { Message } from './message.entity';
import { ReadReceipt } from './read-receipt.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Relationship)
    private readonly relationshipRepo: Repository<Relationship>,
    @InjectRepository(ReadReceipt)
    private readonly readReceiptRepo: Repository<ReadReceipt>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly graphEvents: GraphEventsService,
  ) {}

  private async userExists(userId: number): Promise<boolean> {
    return (await this.userRepo.count({ where: { id: userId } })) > 0;
  }

  private async getActiveRelationships(
    fromId: number,
    toId: number,
  ): Promise<Relationship[]> {
    if (fromId === toId) {
      return [];
    }

    return this.relationshipRepo
      .createQueryBuilder('rel')
      .where('rel.deleted_at IS NULL')
      .andWhere(
        '((rel.from_id = :fromId AND rel.to_id = :toId) OR (rel.from_id = :toId AND rel.to_id = :fromId))',
        { fromId, toId },
      )
      .getMany();
  }

  async sendMessage(fromId: number, toId: number, message: string): Promise<void> {
    if (!toId || !(await this.userExists(toId))) {
      throw new NotFoundException('Target user not found');
    }

    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (trimmed.length > 1000) {
      throw new BadRequestException('Message too long');
    }

    const activeRelationships = await this.getActiveRelationships(fromId, toId);
    if (activeRelationships.length === 0) {
      throw new ForbiddenException('Relationship required to send messages');
    }

    const msg = await this.messageRepo.save(
      this.messageRepo.create({ fromId, toId, message: trimmed }),
    );

    for (const rel of activeRelationships) {
      await this.relationshipRepo
        .createQueryBuilder()
        .update(Relationship)
        .set({
          lastMsgId: msg.id,
          lastMsgTime: () => 'NOW(6)',
          updatedAt: () => 'NOW(6)',
        })
        .where('id = :id', { id: rel.id })
        .execute();
    }

    this.graphEvents.emitNewMessage({ toId, fromId, id: msg.id });
  }

  async syncReadReceipts(userId: number): Promise<ReadReceipt[]> {
    return this.readReceiptRepo.find({ where: { userId } });
  }

  async markRead(
    userId: number,
    peerId: number,
    lastReadMsgId: number,
  ): Promise<void> {
    if (!peerId || lastReadMsgId <= 0) {
      return;
    }

    await this.readReceiptRepo.upsert(
      { userId, peerId, lastReadMsgId },
      ['userId', 'peerId'],
    );
  }

  async retrieveMessages(
    userId: number,
    toId: number,
    beforeId = 0,
    limit = 50,
  ): Promise<Message[]> {
    if (!toId || !(await this.userExists(toId))) {
      throw new NotFoundException('Target user not found');
    }

    const cappedLimit = limit <= 0 || limit > 50 ? 50 : limit;
    const selectFields = [
      'message.id AS id',
      'message.from_id AS from_id',
      'message.to_id AS to_id',
      'message.message AS message',
      'message.timestamp AS timestamp',
    ];
    const baseQuery = this.messageRepo
      .createQueryBuilder('message')
      .select(selectFields)
      .where('message.from_id = :userId AND message.to_id = :toId', {
        userId,
        toId,
      });

    const reverseQuery = this.messageRepo
      .createQueryBuilder('message')
      .select(selectFields)
      .where('message.from_id = :toId AND message.to_id = :userId', {
        userId,
        toId,
      });

    if (beforeId > 0) {
      baseQuery.andWhere('message.id < :beforeId', { beforeId });
      reverseQuery.andWhere('message.id < :beforeId', { beforeId });
    }

    const [baseSql, baseParams] = baseQuery.getQueryAndParameters();
    const [reverseSql, reverseParams] = reverseQuery.getQueryAndParameters();
    const rawSql = `(${baseSql}) UNION ALL (${reverseSql}) ORDER BY id DESC LIMIT ?`;
    const results = await this.messageRepo.query(rawSql, [
      ...baseParams,
      ...reverseParams,
      cappedLimit,
    ]);
    return results.reverse();
  }
}
