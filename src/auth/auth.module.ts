import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Account} from "@/database/entities";
import {MailserviceModule} from "@/mailservice/mailservice.module";
import {IdentifierModule} from "@/identifier/identifier.module";
import {JwtModule} from "@nestjs/jwt";
import {AtStrategy, RtStrategy} from "@/auth/strategies";

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
      MailserviceModule,
      IdentifierModule,
    JwtModule.register({}),
  ],
  exports: [TypeOrmModule.forFeature([Account])],
  controllers: [AuthController],
  providers: [
      AuthService,
    AtStrategy,
    RtStrategy,
  ],
})
export class AuthModule {}
