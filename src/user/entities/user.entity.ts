// src/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    region: string;

    @Column()
    assignedQuestionId: number;

    @Column()
    lastAssigned: Date; // Last time a question was assigned
}
