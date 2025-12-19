import { Controller, Get, Query } from '@nestjs/common';
import { GraphService } from './graph.service';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  async getGraph(
    @Query('userId') userId: string,
    @Query('lastUpdate') lastUpdate?: string,
  ) {
    const currentUserId = Number(userId);
    return this.graphService.getGraphSnapshot(currentUserId, lastUpdate);
  }
}
