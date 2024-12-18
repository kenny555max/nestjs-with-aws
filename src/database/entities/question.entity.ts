// src/questions/entities/question.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('questions')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @Column('text', { array: true })
    regions: string[];

    @Column()
    questionNumber: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'boolean', default: false })
    isOnboarding: boolean; // field to differentiate onboarding questions

    @Column({ type: 'jsonb', nullable: true })
    answeredBy: any[]; // Stores information on users who answered this question

    @Column({ type: "boolean" })
    answered; boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
