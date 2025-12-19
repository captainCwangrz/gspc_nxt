import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  isDirectedType,
  normalizeFromTo,
  RelationType,
  RELATION_TYPES,
} from '../../common/constants';
import { GraphEventsService } from '../events/graph-events.service';
import { RelationshipRequest, RequestStatus } from '../requests/request.entity';
import { Relationship } from './relationship.entity';
import { User } from '../users/user.entity';

@Injectable()
export class RelationshipsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Relationship)
    private readonly relationshipRepo: Repository<Relationship>,
    @InjectRepository(RelationshipRequest)
    private readonly requestRepo: Repository<RelationshipRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly graphEvents: GraphEventsService,
  ) {}

  private nowExpression(): string {
    return this.dataSource.options.type === 'sqlite'
      ? "datetime('now')"
      : 'NOW(6)';
  }

  private async userExists(userId: number): Promise<boolean> {
    return (await this.userRepo.count({ where: { id: userId } })) > 0;
  }

  private async getPairActiveRels(a: number, b: number): Promise<Relationship[]> {
    if (a === b) {
      return [];
    }

    return this.relationshipRepo
      .createQueryBuilder('rel')
      .where('rel.deleted_at IS NULL')
      .andWhere(
        '((rel.from_id = :a AND rel.to_id = :b) OR (rel.from_id = :b AND rel.to_id = :a))',
        { a, b },
      )
      .getMany();
  }

  private async ensureRequestAllowed(
    userId: number,
    toId: number,
    type: RelationType,
    isUpdate: boolean,
  ): Promise<Relationship[]> {
    if (!toId || toId === userId || !RELATION_TYPES.includes(type)) {
      throw new BadRequestException('Invalid parameters');
    }

    if (!(await this.userExists(toId))) {
      throw new NotFoundException('Target user not found');
    }

    const pairRels = await this.getPairActiveRels(userId, toId);

    if (isUpdate) {
      if (pairRels.length === 0) {
        throw new NotFoundException('No active relationship to update');
      }

      const hasOutgoingCrush = pairRels.some(
        (rel) => rel.type === RelationType.CRUSH && rel.fromId === userId,
      );
      const hasUndirected = pairRels.some((rel) => !isDirectedType(rel.type));

      const canUpdate =
        (type === RelationType.CRUSH && (hasOutgoingCrush || hasUndirected)) ||
        (!isDirectedType(type) && (hasUndirected || hasOutgoingCrush));

      if (!canUpdate) {
        throw new NotFoundException('No active relationship to update');
      }
    } else {
      const hasUndirected = pairRels.some((rel) => !isDirectedType(rel.type));
      const hasOutgoingSameType = pairRels.some(
        (rel) => rel.fromId === userId && rel.type === type,
      );

      if (hasOutgoingSameType || (!isDirectedType(type) && hasUndirected)) {
        throw new BadRequestException('Relationship already exists');
      }
    }

    const pendingRequest = await this.requestRepo.findOne({
      where: [
        { fromId: userId, toId, status: RequestStatus.PENDING },
        { fromId: toId, toId: userId, status: RequestStatus.PENDING },
      ],
    });

    if (pendingRequest) {
      throw new BadRequestException('Request pending');
    }

    return pairRels;
  }

  async requestRelationship(
    userId: number,
    toId: number,
    type: RelationType,
    isUpdate = false,
  ): Promise<void> {
    await this.ensureRequestAllowed(userId, toId, type, isUpdate);
    await this.requestRepo.save(
      this.requestRepo.create({ fromId: userId, toId, type }),
    );
    this.graphEvents.emitGraphUpdate({ userId: toId });
  }

  async acceptRequest(userId: number, requestId: number): Promise<void> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId, toId: userId, status: RequestStatus.PENDING },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(RelationshipRequest)
        .set({ status: RequestStatus.ACCEPTED })
        .where('id = :id', { id: requestId })
        .execute();

      if (request.type === RelationType.CRUSH) {
        await manager
          .createQueryBuilder()
          .update(Relationship)
          .set({ deletedAt: () => this.nowExpression() })
          .where('deleted_at IS NULL')
          .andWhere('type != :type', { type: RelationType.CRUSH })
          .andWhere(
            '((from_id = :from AND to_id = :to) OR (from_id = :to AND to_id = :from))',
            { from: request.fromId, to: request.toId },
          )
          .execute();

        const relationship = manager.create(Relationship, {
          fromId: request.fromId,
          toId: request.toId,
          type: RelationType.CRUSH,
        });
        await manager
          .createQueryBuilder()
          .insert()
          .into(Relationship)
          .values(relationship)
          .orUpdate(['type', 'deleted_at', 'updated_at'], ['from_id', 'to_id', 'type'])
          .execute();
      } else {
        await manager
          .createQueryBuilder()
          .update(Relationship)
          .set({ deletedAt: () => this.nowExpression() })
          .where('deleted_at IS NULL')
          .andWhere('type = :type', { type: RelationType.CRUSH })
          .andWhere(
            '((from_id = :from AND to_id = :to) OR (from_id = :to AND to_id = :from))',
            { from: request.fromId, to: request.toId },
          )
          .execute();

        const [normFrom, normTo] = normalizeFromTo(
          request.type,
          request.fromId,
          request.toId,
        );
        const relationship = manager.create(Relationship, {
          fromId: normFrom,
          toId: normTo,
          type: request.type,
        });
        await manager
          .createQueryBuilder()
          .insert()
          .into(Relationship)
          .values(relationship)
          .orUpdate(['type', 'deleted_at', 'updated_at'], ['from_id', 'to_id', 'type'])
          .execute();
      }
    });

    this.graphEvents.emitGraphUpdate({ userId: request.fromId });
    this.graphEvents.emitGraphUpdate({ userId: request.toId });
  }

  async createRelationship(payload: {
    fromId: number;
    toId: number;
    type: RelationType;
  }): Promise<void> {
    const { fromId, toId, type } = payload;

    if (!fromId || !toId || fromId === toId || !RELATION_TYPES.includes(type)) {
      throw new BadRequestException('Invalid parameters');
    }

    if (!(await this.userExists(fromId)) || !(await this.userExists(toId))) {
      throw new NotFoundException('Target user not found');
    }

    await this.dataSource.transaction(async (manager) => {
      if (type === RelationType.CRUSH) {
        await manager
          .createQueryBuilder()
          .update(Relationship)
          .set({ deletedAt: () => this.nowExpression() })
          .where('deleted_at IS NULL')
          .andWhere('type != :type', { type: RelationType.CRUSH })
          .andWhere(
            '((from_id = :from AND to_id = :to) OR (from_id = :to AND to_id = :from))',
            { from: fromId, to: toId },
          )
          .execute();

        const relationship = manager.create(Relationship, {
          fromId,
          toId,
          type: RelationType.CRUSH,
        });
        await manager
          .createQueryBuilder()
          .insert()
          .into(Relationship)
          .values(relationship)
          .orUpdate(['type', 'deleted_at', 'updated_at'], ['from_id', 'to_id', 'type'])
          .execute();
        return;
      }

      await manager
        .createQueryBuilder()
        .update(Relationship)
        .set({ deletedAt: () => this.nowExpression() })
        .where('deleted_at IS NULL')
        .andWhere('type = :type', { type: RelationType.CRUSH })
        .andWhere(
          '((from_id = :from AND to_id = :to) OR (from_id = :to AND to_id = :from))',
          { from: fromId, to: toId },
        )
        .execute();

      const [normFrom, normTo] = normalizeFromTo(type, fromId, toId);
      const relationship = manager.create(Relationship, {
        fromId: normFrom,
        toId: normTo,
        type,
      });
      await manager
        .createQueryBuilder()
        .insert()
        .into(Relationship)
        .values(relationship)
        .orUpdate(['type', 'deleted_at', 'updated_at'], ['from_id', 'to_id', 'type'])
        .execute();
    });
  }

  async rejectRequest(userId: number, requestId: number): Promise<void> {
    const result = await this.requestRepo
      .createQueryBuilder()
      .update(RelationshipRequest)
      .set({ status: RequestStatus.REJECTED })
      .where('id = :id', { id: requestId })
      .andWhere('to_id = :userId', { userId })
      .execute();

    if (!result.affected) {
      throw new NotFoundException('Request not found');
    }

    this.graphEvents.emitGraphUpdate({ userId });
  }

  async removeRelationship(userId: number, toId: number): Promise<void> {
    if (!toId || toId === userId) {
      throw new BadRequestException('Invalid parameters');
    }

    if (!(await this.userExists(toId))) {
      throw new NotFoundException('Target user not found');
    }

    const rows = await this.relationshipRepo
      .createQueryBuilder('rel')
      .where('rel.deleted_at IS NULL')
      .andWhere(
        '((rel.from_id = :userId AND rel.to_id = :toId) OR (rel.from_id = :toId AND rel.to_id = :userId))',
        { userId, toId },
      )
      .getMany();

    const idsToDelete = rows
      .filter((row) =>
        isDirectedType(row.type)
          ? row.fromId === userId || row.toId === userId
          : true,
      )
      .map((row) => row.id);

    if (idsToDelete.length === 0) {
      throw new NotFoundException('No removable relationship found');
    }

    await this.relationshipRepo
      .createQueryBuilder()
      .update(Relationship)
      .set({ deletedAt: () => this.nowExpression() })
      .whereInIds(idsToDelete)
      .execute();

    await this.requestRepo
      .createQueryBuilder()
      .update(RelationshipRequest)
      .set({ status: RequestStatus.REJECTED })
      .where(
        '((from_id = :userId AND to_id = :toId) OR (from_id = :toId AND to_id = :userId))',
        { userId, toId },
      )
      .andWhere('status = :status', { status: RequestStatus.ACCEPTED })
      .execute();

    this.graphEvents.emitGraphUpdate({ userId });
    this.graphEvents.emitGraphUpdate({ userId: toId });
  }
}
