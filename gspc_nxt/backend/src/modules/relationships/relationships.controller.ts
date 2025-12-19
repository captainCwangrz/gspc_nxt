import { Body, Controller, Post } from '@nestjs/common';
import { RelationType } from '../../common/constants';
import { RelationshipsService } from './relationships.service';

@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Post('request')
  async requestRelationship(
    @Body('userId') userId: number,
    @Body('toId') toId: number,
    @Body('type') type: RelationType,
  ) {
    await this.relationshipsService.requestRelationship(userId, toId, type, false);
    return { success: true };
  }

  @Post('update')
  async updateRelationship(
    @Body('userId') userId: number,
    @Body('toId') toId: number,
    @Body('type') type: RelationType,
  ) {
    await this.relationshipsService.requestRelationship(userId, toId, type, true);
    return { success: true };
  }

  @Post('accept')
  async acceptRequest(
    @Body('userId') userId: number,
    @Body('requestId') requestId: number,
  ) {
    await this.relationshipsService.acceptRequest(userId, requestId);
    return { success: true };
  }

  @Post('reject')
  async rejectRequest(
    @Body('userId') userId: number,
    @Body('requestId') requestId: number,
  ) {
    await this.relationshipsService.rejectRequest(userId, requestId);
    return { success: true };
  }

  @Post('remove')
  async removeRelationship(
    @Body('userId') userId: number,
    @Body('toId') toId: number,
  ) {
    await this.relationshipsService.removeRelationship(userId, toId);
    return { success: true };
  }
}
