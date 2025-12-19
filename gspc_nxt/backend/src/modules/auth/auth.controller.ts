import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body('username') username: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(username, password);
  }

  @Post('register')
  async register(@Body() body: {
    username: string;
    password: string;
    confirmPassword: string;
    realName: string;
    dob: string;
    avatar?: string;
  }) {
    await this.authService.register(body);
    return { success: true };
  }
}
