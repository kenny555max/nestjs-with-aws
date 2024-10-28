// src/scheduler/cycle-update.service.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
//import { CycleService } from '../cycle/cycle.service';

@Injectable()
export class CycleUpdateService {
    constructor(
        //private cycleService: CycleService
    ) {}

    @Cron('0 19 * * 1', { timeZone: 'Asia/Singapore' })  // Executes every Monday at 7 PM SGT
    handleWeeklyCycleUpdate() {
        //this.cycleService.getCurrentCycle(); // Trigger recalculation of cycle
    }
}
