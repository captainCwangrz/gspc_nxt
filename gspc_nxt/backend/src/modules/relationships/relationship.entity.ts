import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RelationType } from '../../common/constants';

@Entity({ name: 'relationships' })
@Index(['fromId', 'toId', 'type'], { unique: true })
export class Relationship {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'from_id' })
  fromId!: number;

  @Column({ name: 'to_id' })
  toId!: number;

  @Column({ type: 'simple-enum', enum: RelationType })
  type!: RelationType;

  @Column({ name: 'last_msg_id', type: 'int', default: 0 })
  lastMsgId!: number;

  @Column({ name: 'last_msg_time', type: 'datetime', precision: 6, nullable: true })
  lastMsgTime?: Date | null;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
