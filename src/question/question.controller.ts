// src/question/question.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { QuestionService } from './question.service';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get(':region')
  async getQuestionForRegion(@Param('region') region: string) {
    return this.questionService.getQuestionForRegion(region);
  }
}
