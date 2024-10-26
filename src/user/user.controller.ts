// src/user/user.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { QuestionService } from '../question/question.service';

@Controller('users')
export class UserController {
  constructor(private questionService: QuestionService) {}

  @Get(':id/question')
  async getUserQuestion(@Param('id') id: number) {
    const question = await this.questionService.getAssignedQuestion(id);
    return question;
  }
}
