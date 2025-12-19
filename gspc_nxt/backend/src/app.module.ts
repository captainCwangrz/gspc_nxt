import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from './modules/chat/chat.module';
import { GraphEventsModule } from './modules/events/graph-events.module';
import { GraphModule } from './modules/graph/graph.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { AuthModule } from './modules/auth/auth.module';
import { Message } from './modules/chat/message.entity';
import { ReadReceipt } from './modules/chat/read-receipt.entity';
import { Relationship } from './modules/relationships/relationship.entity';
import { RelationshipRequest } from './modules/requests/request.entity';
import { User } from './modules/users/user.entity';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseType = (process.env.DB_TYPE ?? 'mysql') as
          | 'mysql'
          | 'sqlite';
        const isSqlite = databaseType === 'sqlite';

        return {
          type: databaseType,
          host: isSqlite ? undefined : process.env.DB_HOST,
          port: isSqlite ? undefined : Number(process.env.DB_PORT ?? 3306),
          username: isSqlite ? undefined : process.env.DB_USER,
          password: isSqlite ? undefined : process.env.DB_PASSWORD,
          database: isSqlite
            ? process.env.DB_NAME ?? ':memory:'
            : process.env.DB_NAME,
          entities: [User, Relationship, RelationshipRequest, Message, ReadReceipt],
          synchronize: isSqlite || process.env.DB_SYNC === 'true',
        };
      },
    }),
    GraphEventsModule,
    AuthModule,
    GraphModule,
    RelationshipsModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
