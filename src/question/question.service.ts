import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '@/database/entities';
import { CreateQuestionDto, QuestionResponseDto } from '@/database/dtos/question.dto';
import { CachedQuestion } from '@/database/interfaces';
import { Cron, CronExpression } from '@nestjs/schedule';
import {ErrorHandler} from "@/utils";

/**
 * Service for managing questions, caching, and retrieval.
 */
@Injectable()
export class QuestionsService implements OnModuleInit {
  private readonly logger = new Logger(QuestionsService.name);
  private readonly CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds
  private readonly SUPPORTED_REGIONS = ['SG', 'US', 'EU'];

  /**
   * Constructor to inject Redis and TypeORM repository dependencies.
   * @param {Redis} redis - Injected Redis client.
   * @param {Repository<Question>} questionsRepository - Injected TypeORM repository for Question entity.
   */
  constructor(
      @InjectRedis() private readonly redis: Redis,
      @InjectRepository(Question)
      private questionsRepository: Repository<Question>,
  ) {}

  /**
   * Initializes the service by warming up the cache.
   * @returns {Promise<void>}
   */
  async onModuleInit() {
    // Warm up cache for all regions on service start
    await this.warmupCache();
  }

  /**
   * Calculates the week number for a given date.
   * @param {Date} date - The date to calculate the week number.
   * @returns {number} The calculated week number.
   */
  private getWeekNumber(date: Date): number {
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
        (date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    return Math.ceil(days / 7);
  }

  /**
   * Generates a cache key based on region and week number.
   * @param {string} region - Region code.
   * @param {number} weekNumber - Week number.
   * @returns {string} The generated cache key.
   */
  private getCacheKey(region: string, weekNumber: number): string {
    return `question:${region}:week:${weekNumber}`;
  }

  /**
   * Warms up the cache for supported regions and the current week.
   * @returns {Promise<void>}
   */
  private async warmupCache(): Promise<void> {
    try {
      const currentWeek = this.getWeekNumber(new Date());

      for (const region of this.SUPPORTED_REGIONS) {
        await this.cacheQuestionForWeek(region, currentWeek);
      }

      this.logger.log('Cache warmup completed successfully');
    } catch (error) {
      ErrorHandler.handleError('WarmCache.error', error);
    }
  }

  /**
   * Caches a question for a specific region and week.
   * @param {string} region - Region code.
   * @param {number} weekNumber - Week number.
   * @returns {Promise<void>}
   */
  private async cacheQuestionForWeek(region: string, weekNumber: number): Promise<void> {
    const question = await this.getQuestionForWeek(region, weekNumber);

    if (!question) {
      throw new NotFoundException(`No question found for region ${region} and week ${weekNumber}`);
    }

    const cachedQuestion: CachedQuestion = {
      id: question.id,
      content: question.content,
      metadata: question.metadata,
      weekNumber,
      region,
      timestamp: Date.now(),
    };

    await this.redis.setex(
        this.getCacheKey(region, weekNumber),
        this.CACHE_TTL,
        JSON.stringify(cachedQuestion)
    );
  }

  /**
   * Retrieves a question for a specific region and week.
   * @param {string} region - Region code.
   * @param {number} weekNumber - Week number.
   * @returns {Promise<Question>} The question if found.
   */
  private async getQuestionForWeek(region: string, weekNumber: number): Promise<Question> {
    const questionNumber = await this.calculateQuestionNumber(region, weekNumber);

    const question = await this.questionsRepository.findOne({
      where: {
        regions: region,
        questionNumber,
        isActive: true,
      },
    });

    return question;
  }

  /**
   * Calculates the question number based on region and week.
   * @param {string} region - Region code.
   * @param {number} weekNumber - Week number.
   * @returns {Promise<number>} Calculated question number.
   */
  private async calculateQuestionNumber(region: string, weekNumber: number): Promise<number> {
    const totalQuestions = await this.questionsRepository.count({
      where: {
        regions: region,
        isActive: true,
      },
    });

    // Implement rotating question selection
    return (weekNumber % totalQuestions) + 1;
  }

  /**
   * Gets the current question for a region, either from cache or database.
   * @param {string} region - Region code.
   * @returns {Promise<QuestionResponseDto>} The current question's details.
   */
  async getCurrentQuestion(region: string): Promise<QuestionResponseDto> {
    if (!this.SUPPORTED_REGIONS.includes(region)) {
      throw new NotFoundException(`Region ${region} is not supported`);
    }

    const currentWeek = this.getWeekNumber(new Date());
    const cacheKey = this.getCacheKey(region, currentWeek);

    try {
      // Try to get from cache first
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const cachedQuestion: CachedQuestion = JSON.parse(cachedData);
        return {
          id: cachedQuestion.id,
          content: cachedQuestion.content,
          metadata: cachedQuestion.metadata,
          weekNumber: cachedQuestion.weekNumber,
          region: cachedQuestion.region,
        };
      }

      // If not in cache, get from database and cache it
      await this.cacheQuestionForWeek(region, currentWeek);

      // Retry from cache
      const newCachedData = await this.redis.get(cacheKey);
      const question: CachedQuestion = JSON.parse(newCachedData);

      return {
        id: question.id,
        content: question.content,
        metadata: question.metadata,
        weekNumber: question.weekNumber,
        region: question.region,
      };
    } catch (error) {
      ErrorHandler.handleError(`Error getting question for region ${region}`, error);
      throw error;
    }
  }

  /**
   * Daily cron job to refresh the cache.
   * @returns {Promise<void>}
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyQuestionUpdate() {
    await this.warmupCache();
  }

  /**
   * Creates a new question and saves it in the database.
   * @param {CreateQuestionDto} createQuestionDto - Data to create the question.
   * @returns {Promise<any>} The newly created question.
   */
  async createQuestion(createQuestionDto: CreateQuestionDto): Promise<any> {
    const question = this.questionsRepository.create(createQuestionDto);
    return this.questionsRepository.save(question);
  }

  /**
   * Deactivates a question and invalidates related cache entries.
   * @param {string} id - ID of the question to deactivate.
   * @returns {Promise<void>}
   */
  async deactivateQuestion(id: string): Promise<void> {
    await this.questionsRepository.update(id, { isActive: false });
    // Invalidate cache for all regions
    for (const region of this.SUPPORTED_REGIONS) {
      const currentWeek = this.getWeekNumber(new Date());
      const cacheKey = this.getCacheKey(region, currentWeek);
      await this.redis.del(cacheKey);
    }
  }
}
