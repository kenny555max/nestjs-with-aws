// src/questions/questions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
//import { RedisModule } from '@nestjs-modules/ioredis';
import { ScheduleModule } from '@nestjs/schedule';
import { QuestionsController } from './question.controller';
import { QuestionsService } from './question.service';
import { Question } from '@/database/entities/question.entity';

/**
 * QuestionsModule sets up dependencies and services.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Question]),
    //RedisModule.forRootAsync({
    //  useFactory: () => ({
    //    host: process.env.REDIS_HOST,
    //    port: parseInt(process.env.REDIS_PORT, 10),
    //  }),
    //}),
    ScheduleModule.forRoot(),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
