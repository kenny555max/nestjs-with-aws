// src/questions/interfaces/question-cache.interface.ts
export interface CachedQuestion {
    id: string;
    content: string;
    metadata: any;
    weekNumber: number;
    region: string;
    timestamp: number;
}