import { Client } from 'pg';

export async function fetchOneQuestionByGenderAndRegion(dbClient: Client, gender: string, region: string) {
    const query = `
        SELECT id, text, media_file
        FROM onboarding_questions
        WHERE gender = $1 AND region = $2 AND answered = false
        ORDER BY created_at ASC
        LIMIT 1;
    `;
    const result = await dbClient.query(query, [gender, region]);
    return result.rows;
}

export async function fetchQuestionsByGenderAndRegion(dbClient: Client, gender: string, region: string) {
    const query = `
        SELECT id, text, media_file
        FROM onboarding_questions
        WHERE gender = $1 AND region = $2 AND answered = false
        ORDER BY created_at ASC;
    `;
    const result = await dbClient.query(query, [gender, region]);
    return result.rows;
}

export async function filterUnansweredQuestions(dbClient: Client, userId: string, questions: any[]) {
    const answeredQuestionIds = await getAnsweredQuestionIds(dbClient, userId);
    return questions.filter(question => !answeredQuestionIds.includes(question.id));
}

export async function getAnsweredQuestionIds(dbClient: Client, userId: string) {
    const query = `
        SELECT question_id
        FROM user_question_responses
        WHERE user_id = $1
    `;
    const result = await dbClient.query(query, [userId]);
    return result.rows.map(row => row.question_id);
}