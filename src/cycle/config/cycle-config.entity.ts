// src/config/cycle-config.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CycleConfig {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 7 })
    durationDays: number;

    @Column({ type: 'time', default: '19:00:00' }) // Default to 7 PM SGT
    startTime: string;
}
