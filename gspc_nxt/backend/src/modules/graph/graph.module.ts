import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Relationship } from '../relationships/relationship.entity';
import { RelationshipRequest } from '../requests/request.entity';
import { User } from '../users/user.entity';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Relationship, RelationshipRequest])],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
