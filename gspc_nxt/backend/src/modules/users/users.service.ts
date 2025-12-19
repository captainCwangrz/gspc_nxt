import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async updateSignature(userId: number, signature: string) {
    const trimmed = signature?.trim() ?? '';
    if (!trimmed) {
      throw new BadRequestException('Signature cannot be empty.');
    }

    const normalized = trimmed.slice(0, 160);
    const result = await this.userRepo.update({ id: userId }, { signature: normalized });
    if (!result.affected) {
      throw new NotFoundException('User not found.');
    }

    return normalized;
  }
}
