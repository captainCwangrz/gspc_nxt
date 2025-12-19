import { Module } from '@nestjs/common';
import { GraphEventsService } from './graph-events.service';
import { GraphGateway } from './graph.gateway';

@Module({
  providers: [GraphEventsService, GraphGateway],
  exports: [GraphEventsService],
})
export class GraphEventsModule {}
