// src/migrations/1635000000000-CreateQuestionsTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateQuestionsTable1635000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'questions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'content',
                        type: 'text',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'regions',
                        type: 'text',
                        isArray: true,
                    },
                    {
                        name: 'question_number',
                        type: 'integer',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'now()',
                    },
                ],
                indices: [
                    {
                        name: 'idx_questions_regions',
                        columnNames: ['regions'],
                    },
                    {
                        name: 'idx_questions_number',
                        columnNames: ['question_number'],
                    },
                ],
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('questions');
    }
}