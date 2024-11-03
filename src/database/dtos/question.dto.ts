// src/questions/dto/question.dto.ts
export class CreateQuestionDto {
    content: string;
    regions: string[];
    questionNumber: number;
    metadata?: any;
}

export class QuestionResponseDto {
    id: string;
    content: string;
    metadata: any;
    weekNumber: number;
    region: string;
}