import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'messages' })
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'from_id' })
  fromId!: number;

  @Column({ name: 'to_id' })
  toId!: number;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'timestamp', type: 'datetime', precision: 6 })
  timestamp!: Date;
}
