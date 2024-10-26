// src/question/question.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class QuestionService {
  constructor(
      @InjectRepository(Question)
      private questionsRepository: Repository<Question>,
      @InjectRepository(User)
      private usersRepository: Repository<User>,
  ) {}

  async assignQuestionToUser(userId: number): Promise<void> {
    const user = await this.usersRepository.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get the current date and calculate the cycle
    const now = new Date();
    const weekStart = this.getWeekStart(now);

    const question = await this.questionsRepository.findOne({
      where: {
        region: user.region,
        cycleStart: weekStart,
      },
    });

    if (question) {
      user.assignedQuestionId = question.id;
      user.lastAssigned = new Date();
      await this.usersRepository.save(user);
    }
  }

  private getWeekStart(date: Date): Date {
    const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    monday.setHours(19, 0, 0); // Set to 7 PM
    return monday;
  }
}
