/// src/questions/controllers/questions.controller.ts
import { Controller, Get, Post, Param, Body, Delete, Query, Patch } from '@nestjs/common';
import { QuestionsService } from './question.service';
import { CreateQuestionDto, QuestionResponseDto } from '@/database/dtos';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Controller for handling questions-related HTTP requests.
 */
@Controller('questions')
@ApiTags('Questions management')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Updates the user's response to a specific onboarding question.
   * This method checks if the user has already responded to the question.
   * If not, it records the user's response and updates the question record in the database.
   *
   * @param {Object} updateDto - The data for updating the response.
   * @param {string} updateDto.questionId - The ID of the onboarding question.
   * @param {string} updateDto.userId - The ID of the user providing the response.
   * @returns {Promise<Question>} The updated question object after saving the user's response.
   * @throws {Error} If the question is not found or if the user has already answered the question.
   */
  @Patch('/response')
  @ApiOperation({ summary: 'Update user response to an onboarding question' })
  @ApiResponse({
    status: 200,
    description: 'User response updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Error: Question not found or user already answered the question.',
  })
  async updateOnboardingQuestionResponse(
      @Body() updateDto: { questionId: string, userId: string },
  ) {
    const { questionId, userId } = updateDto;
    return await this.questionsService.updateOnboardingQuestionResponse(questionId, userId);
  }

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
