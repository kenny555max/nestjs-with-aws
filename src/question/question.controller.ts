/// src/questions/controllers/questions.controller.ts
import { Controller, Get, Post, Param, Body, Delete, Query } from '@nestjs/common';
import { QuestionsService } from './question.service';
import { CreateQuestionDto, QuestionResponseDto } from '@/database/dtos';

/**
 * Controller for handling questions-related HTTP requests.
 */
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Retrieves the current question based on region.
   * @param {string} region - Region code (via query parameter).
   * @returns {Promise<QuestionResponseDto>} Current question details.
   */
  @Get('current')
  getCurrentQuestion(@Query('region') region: string): Promise<QuestionResponseDto> {
    return this.questionsService.getCurrentQuestion(region);
  }

  /**
   * Creates a new question.
   * @param {CreateQuestionDto} createQuestionDto - Data to create the question.
   * @returns {Promise<Question>} Created question.
   */
  @Post()
  createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.createQuestion(createQuestionDto);
  }

  /**
   * Deactivates a question by ID.
   * @param {string} id - ID of the question to deactivate.
   * @returns {Promise<void>}
   */
  @Delete(':id')
  deactivateQuestion(@Param('id') id: string) {
    return this.questionsService.deactivateQuestion(id);
  }
}
