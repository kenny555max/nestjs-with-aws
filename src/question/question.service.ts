// src/question/question.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './entities/question.entity';
import { CycleService } from '../cycle/cycle.service';

@Injectable()
export class QuestionService {
  constructor(
      @InjectRepository(Question)
      private questionRepository: Repository<Question>,
      private cycleService: CycleService
  ) {}

  async getQuestionForRegion(region: string): Promise<Question> {
    const currentCycle = await this.cycleService.getCurrentCycle();
    return this.questionRepository.findOne({ where: { region, cycle: currentCycle } });
  }
}
