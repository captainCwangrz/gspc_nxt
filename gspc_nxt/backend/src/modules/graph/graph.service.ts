import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { User } from '../users/user.entity';
import { Relationship } from '../relationships/relationship.entity';
import { RelationshipRequest, RequestStatus } from '../requests/request.entity';

export interface GraphSnapshot {
  nodes: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  requests: Array<Record<string, unknown>>;
  currentUserId: number;
  lastUpdate: string | null;
  incremental: boolean;
  etag: string;
}

@Injectable()
export class GraphService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Relationship)
    private readonly relationshipRepo: Repository<Relationship>,
    @InjectRepository(RelationshipRequest)
    private readonly requestRepo: Repository<RelationshipRequest>,
  ) {}

  private formatTimestamp(date: Date | null): string | null {
    if (!date) {
      return null;
    }

    return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
  }

  private async buildStateSnapshot(currentUserId: number) {
    const [userUpdate] = await this.userRepo.query(
      'SELECT MAX(updated_at) as users_updated_at FROM users',
    );
    const [relUpdate] = await this.relationshipRepo.query(
      'SELECT MAX(updated_at) as rels_updated_at FROM relationships',
    );
    const [reqState] = await this.requestRepo.query(
      'SELECT MAX(updated_at) as req_updated_at, COUNT(*) as req_count FROM requests WHERE to_id = ? AND status = ?',
      [currentUserId, RequestStatus.PENDING],
    );

    const usersUpdatedAt = userUpdate?.users_updated_at
      ? new Date(userUpdate.users_updated_at)
      : null;
    const relsUpdatedAt = relUpdate?.rels_updated_at
      ? new Date(relUpdate.rels_updated_at)
      : null;
    const reqUpdatedAt = reqState?.req_updated_at
      ? new Date(reqState.req_updated_at)
      : null;
    const reqCount = Number(reqState?.req_count ?? 0);

    const etagParts = [
      usersUpdatedAt?.toISOString() ?? '0',
      relsUpdatedAt?.toISOString() ?? '0',
      reqUpdatedAt?.toISOString() ?? '0',
      String(reqCount),
      String(currentUserId),
    ];

    return {
      usersUpdatedAt,
      relsUpdatedAt,
      reqUpdatedAt,
      reqCount,
      etag: createHash('md5').update(etagParts.join('|')).digest('hex'),
    };
  }

  async getGraphSnapshot(
    currentUserId: number,
    lastUpdate?: string,
  ): Promise<GraphSnapshot> {
    const parsedLastUpdate = lastUpdate ? new Date(lastUpdate) : null;
    const isIncremental = Boolean(parsedLastUpdate && !Number.isNaN(parsedLastUpdate.getTime()));
    const stateSnapshot = await this.buildStateSnapshot(currentUserId);

    let nodes: User[];
    let links: Relationship[];

    if (isIncremental && parsedLastUpdate) {
      const bufferedTime = new Date(parsedLastUpdate.getTime() - 2000);
      nodes = await this.userRepo
        .createQueryBuilder('user')
        .where('user.updated_at > :bufferedTime', { bufferedTime })
        .getMany();
      links = await this.relationshipRepo
        .createQueryBuilder('rel')
        .where('rel.updated_at > :bufferedTime', { bufferedTime })
        .getMany();
    } else {
      nodes = await this.userRepo.find();
      links = await this.relationshipRepo.find({ where: { deletedAt: null } });
    }

    const requests = await this.requestRepo
      .createQueryBuilder('request')
      .select([
        'request.id as id',
        'request.from_id as from_id',
        'request.type as type',
        'user.username as username',
      ])
      .innerJoin(User, 'user', 'user.id = request.from_id')
      .where('request.to_id = :currentUserId', { currentUserId })
      .andWhere('request.status = :status', { status: RequestStatus.PENDING })
      .orderBy('request.updated_at', 'DESC')
      .getRawMany();

    const formattedNodes = nodes.map((user) => ({
      id: user.id,
      name: user.realName,
      username: user.username,
      avatar: `assets/${user.avatar}`,
      signature: user.signature ?? 'No gossip yet.',
      val: 1,
      last_msg_id: 0,
    }));

    const formattedLinks = links.map((edge) => ({
      source: edge.fromId,
      target: edge.toId,
      type: edge.type,
      last_msg_id: edge.lastMsgId ?? 0,
      deleted: edge.deletedAt ? true : false,
    }));

    const relUpdate = stateSnapshot.relsUpdatedAt ?? new Date(0);
    const userUpdate = stateSnapshot.usersUpdatedAt ?? new Date(0);
    const clientNextCursor = new Date(
      Math.max(relUpdate.getTime(), userUpdate.getTime()),
    );

    return {
      nodes: formattedNodes,
      links: formattedLinks,
      requests,
      currentUserId,
      lastUpdate: this.formatTimestamp(clientNextCursor),
      incremental: isIncremental,
      etag: stateSnapshot.etag,
    };
  }
}
