import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphEventsModule } from '../events/graph-events.module';
import { RelationshipRequest } from '../requests/request.entity';
import { User } from '../users/user.entity';
import { Relationship } from './relationship.entity';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Relationship, RelationshipRequest, User]),
    GraphEventsModule,
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
