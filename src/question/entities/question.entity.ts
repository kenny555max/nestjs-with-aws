// src/entities/question.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Question {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    region: string;

    @Column()
    text: string;

    @Column()
    cycleStart: Date; // Date when the question is assigned

    @Column()
    cycleDuration: number; // Duration in days
}
