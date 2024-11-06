// lib/lambda/onboardUser.ts
import { Client } from 'pg'; // PostgreSQL client
import * as AWS from 'aws-sdk';
import Redis from 'ioredis';
import {fetchOneQuestionByGenderAndRegion, fetchQuestionsByGenderAndRegion, filterUnansweredQuestions} from "./actions";

const redisClient = new Redis({
    host: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT ?? "6379")
});

//const s3 = new AWS.S3();
const sns = new AWS.SNS();
const cloudFrontURL = process.env.CLOUDFRONT_URL; // CloudFront distribution URL

const dbClient = new Client({
    host: process.env.DB_ENDPOINT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT ?? "5432"),
});

let dbconnected = null;

async function connectToDatabase() {
    if (dbconnected !== null) {
        dbconnected = await dbClient.connect();
    }
}

async function getQuestionSuggestions(gender: string, userId: any) {
    const redisKey = `suggestions:${gender}`;
    const cachedSuggestions = await redisClient.get(redisKey);

    if (cachedSuggestions) {
        return JSON.parse(cachedSuggestions);
    }

    const suggestions = await generateSuggestions(userId);
    await redisClient.set(redisKey, JSON.stringify(suggestions), 'EX', 24 * 60 * 60); // Cache for 1 day

    return suggestions;
}

// Function to generate question suggestions based on gender and profile data
async function generateSuggestions(userId: string) {
    await connectToDatabase();

    try {
        // Fetch user profile data from the database
        const userProfileQuery = 'SELECT gender, profile_data FROM users WHERE id = $1';
        const result = await dbClient.query(userProfileQuery, [userId]);

        if (result.rows.length === 0) {
            throw new Error(`User with ID ${userId} not found`);
        }

        const user = result.rows[0];
        const { gender, region } = user;

        // Fetch relevant onboarding questions from the database
        let questions;
        if (gender === 'female') {
            // Fetch tailored questions for female users
            questions = await fetchOneQuestionByGenderAndRegion(dbClient, 'female', region);
        } else {
            // Fetch all available questions for male users
            questions = await fetchQuestionsByGenderAndRegion(dbClient, 'male', region);
        }

        // Filter out questions already answered by the user
        const unansweredQuestions = await filterUnansweredQuestions(dbClient, userId, questions);

        const url = await getCloudFrontMediaUrl(`${gender}-suggestions`);

        return unansweredQuestions.map((question) => ({
            id: question.id,
            text: question.text,
            media: url
        }));
    } catch (error) {
        console.error(`Error generating suggestions: ${error.message}`);
        throw error;
    }
}

// Function to retrieve media URL from CloudFront
async function getCloudFrontMediaUrl(fileName: string) {
    return `${cloudFrontURL}/${fileName}`;
}

export const handler = async (event: any) => {
    let gender, userId;

    try {
        const body = JSON.parse(event.body);
        gender = body.gender;
        userId = body.userId;

        // Validate input
        if (!gender || !userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing gender or userId' })
            };
        }

        const suggestions = await getQuestionSuggestions(gender, userId);

        return {
            statusCode: 200,
            body: JSON.stringify({ suggestions })
        };
    } catch (error) {
        console.error('Error during onboarding:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
