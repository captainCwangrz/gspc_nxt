import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signature')
  async updateSignature(
    @Body('userId') userId: number,
    @Body('signature') signature: string,
  ) {
    const updatedSignature = await this.usersService.updateSignature(userId, signature);
    return { success: true, signature: updatedSignature };
  }
}
