// lib/lambda/assignQuestions.ts
import { Client } from 'pg'; // PostgreSQL client
import * as AWS from 'aws-sdk';
import Redis from 'ioredis';

const redisClient = new Redis({
    host: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT ?? "6379")
});
const sns = new AWS.SNS();

async function getSecretValue(secretName: string) {
    const client = new AWS.SecretsManager();
    const data = await client.getSecretValue({ SecretId: secretName }).promise();
    if (data && 'SecretString' in data) {
        return JSON.parse(data.SecretString ?? "");
    }
    throw new Error('Secret not found');
}

export const handler = async () => {
    const secret = await getSecretValue('dbAdminSecret'); // Retrieve the secret
    const client = new Client({
        host: process.env.DB_ENDPOINT, // RDS endpoint
        database: process.env.DB_NAME, // Database name
        user: secret.username, // Username from secret
        password: secret.password, // Password from secret
    });

    await client.connect();

    try {
        // fetching users and assigning questions
        const users = await client.query('SELECT * FROM users');
        const currentCycle = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));

        for (const user of users.rows) {
            const question = await assignQuestionBasedOnRegion(user.region, currentCycle, client);
            await client.query('UPDATE users SET assignedQuestionId = $1 WHERE id = $2', [question.id, user.id]);

            // Notify user via SNS
            await sns.publish({
                Message: `You have been assigned question: ${question.text}`,
                TopicArn: process.env.SNS_TOPIC_ARN, // Set SNS Topic ARN in Lambda environment variables
            }).promise();
        }
    } catch (error) {
        console.error('Error assigning questions:', error);
    } finally {
        await client.end();
    }
};

// Function to assign questions based on the user's region and the current cycle
const assignQuestionBasedOnRegion = async (region: string, currentCycle: number, client: Client) => {
    const redisKey = `question:${region}:${currentCycle}`;
    const cachedQuestion = await redisClient.get(redisKey);

    if (cachedQuestion) {
        return JSON.parse(cachedQuestion);
    }

    // SQL to fetch question for specific region and cycle
    const query = `
        SELECT * FROM questions
        WHERE region = $1
          AND cycle = $2
        ORDER BY id LIMIT 1
    `;

    const { rows } = await client.query(query, [region, currentCycle]);

    // Return the question or a default if no match
    if (rows.length > 0) {
        await redisClient.set(redisKey, JSON.stringify(rows[0]), 'EX', 7 * 24 * 60 * 60);
        return rows[0];
    } else {
        throw new Error(`No question available for region: ${region} in cycle: ${currentCycle}`);
    }
};
