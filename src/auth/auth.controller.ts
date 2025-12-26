import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: JwtPayload;
}
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: RequestWithUser): Promise<JwtPayload> {
    return Promise.resolve(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '') || '';
    return this.authService.logout(token);
  }
}
