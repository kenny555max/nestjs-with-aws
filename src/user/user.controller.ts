import { GetCurrentUserId } from '@/common/decorators';
import { UpdateAccountDto } from '@/database/dtos';
import { QueryDto } from '@/utils/query';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  ValidationPipe,
  Version,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('user-controller')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Version('1')
  @Get()
  findAll(@Query(new ValidationPipe({ transform: true })) query: QueryDto) {
    return this.userService.findAll(query);
  }

  @Version('1')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Version('1')
  @Put()
  updateProfile(
      @GetCurrentUserId() userId: string,
      @Body() payload: UpdateAccountDto,
  ) {
    return this.userService.updateUser(payload, userId);
  }
}

