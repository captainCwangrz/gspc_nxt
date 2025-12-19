import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RelationType } from '../../common/constants';

export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'requests' })
export class RelationshipRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'from_id' })
  fromId!: number;

  @Column({ name: 'to_id' })
  toId!: number;

  @Column({ type: 'simple-enum', enum: RelationType })
  type!: RelationType;

  @Column({
    type: 'simple-enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status!: RequestStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
