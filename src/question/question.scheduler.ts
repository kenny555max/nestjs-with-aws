// src/question/question.scheduler.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QuestionService } from './question.service';

@Injectable()
export class QuestionScheduler {
    constructor(private questionService: QuestionService) {}

    @Cron('0 19 * * MON') // Every Monday at 7 PM
    async handleCron() {
        const users = [] //await this.questionService.getAllUsers(); // Implement this method
        for (const user of users) {
            //await this.questionService.assignQuestionToUser(user.id);
        }
    }
}
