import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Question } from './database/entities';
import { QuestionsService } from './question/question.service';
import { PassportModule } from '@nestjs/passport';
import { QuestionsController } from './question/question.controller';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import configuration from "@/config/env.config";
import {POSTGRESDatabaseProviderModule} from "@/database/postgres/posgres.provider";
import {IdentifierModule} from "@/identifier/identifier.module";
import {MailserviceModule} from "@/mailservice/mailservice.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
            envFilePath: '.env',
        }),
        TypeOrmModule.forFeature([Question]),
        PassportModule.register({ session: true }),
        ScheduleModule.forRoot(),
        POSTGRESDatabaseProviderModule,
        UserModule,
        AuthModule,
        IdentifierModule,
        MailserviceModule
    ],
    controllers: [QuestionsController],
    providers: [
        QuestionsService,
    ],
})
export class AppModule {}
