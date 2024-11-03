import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Account} from "@/database/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
  ],
  exports: [TypeOrmModule.forFeature([Account]), UserService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
