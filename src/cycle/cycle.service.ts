// src/cycle/cycle.service.ts
import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleConfig } from './config/cycle-config.entity';

@Injectable()
export class CycleService {
    constructor(
        @InjectRepository(CycleConfig)
        private cycleConfigRepository: Repository<CycleConfig>
    ) {}


    async getCurrentCycle(): Promise<number> {
        const config = await this.cycleConfigRepository.findOne({ where: { id: 1 } });
        if (!config) throw new Error('Cycle configuration not found');

        const { durationDays, startTime } = config;
        const startOfCycle = moment.tz(`2024-11-01 ${startTime}`, 'Asia/Singapore');  // Base cycle start date
        const now = moment.tz('Asia/Singapore');

        return Math.floor(now.diff(startOfCycle, 'days') / durationDays) + 1;
    }
}

