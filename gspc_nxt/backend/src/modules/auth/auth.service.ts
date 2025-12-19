import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AVATARS, FALLBACK_AVATAR } from '../../common/constants';
import { User } from '../users/user.entity';

export interface LoginResult {
  token: string;
  userId: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private validateUsername(username: string): void {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new BadRequestException('Invalid username format');
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password too short');
    }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    this.validateUsername(username);
    this.validatePassword(password);

    const user = await this.userRepo.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, username: user.username });
    return { token, userId: user.id };
  }

  async register(payload: {
    username: string;
    password: string;
    confirmPassword: string;
    realName: string;
    dob: string;
    avatar?: string;
  }): Promise<void> {
    const { username, password, confirmPassword, realName, dob, avatar } = payload;

    if (!username || !password || !confirmPassword || !realName || !dob) {
      throw new BadRequestException('Missing fields');
    }

    this.validateUsername(username);
    this.validatePassword(password);

    if (password !== confirmPassword) {
      throw new BadRequestException('Password mismatch');
    }

    if (realName.length > 50) {
      throw new BadRequestException('Real name too long');
    }

    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime()) || dobDate.toISOString().slice(0, 10) !== dob) {
      throw new BadRequestException('Invalid date');
    }

    const now = new Date();
    if (dobDate > now) {
      throw new BadRequestException('Date of birth cannot be in the future');
    }

    const age = now.getFullYear() - dobDate.getFullYear();
    if (age < 13 || age > 120) {
      throw new BadRequestException('Invalid age');
    }

    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username already taken');
    }

    const chosenAvatar = avatar && AVATARS.includes(avatar) ? avatar : FALLBACK_AVATAR;
    const passwordHash = await bcrypt.hash(password, 10);

    await this.userRepo.save(
      this.userRepo.create({
        username,
        realName,
        dob,
        passwordHash,
        avatar: chosenAvatar,
        signature: null,
      }),
    );
  }
}
