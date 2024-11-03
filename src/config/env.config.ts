import * as dotenv from 'dotenv';
dotenv.config();

const configuration = () => {
    if (!process.env.JWT_ACCESS_TOKEN_SECRET) {
        throw Error('Missing Env: JWT_ACCESS_TOKEN_SECRET');
    }
    if (!process.env.JWT_ACCESS_TOKEN_EXPIRES) {
        throw Error('Missing Env: JWT_ACCESS_TOKEN_EXPIRES');
    }
    if (!process.env.JWT_REFRESH_TOKEN_SECRET) {
        throw Error('Missing Env: JWT_REFRESH_TOKEN_SECRET');
    }
    if (!process.env.JWT_REFRESH_TOKEN_EXPIRES) {
        throw Error('Missing Env: JWT_REFRESH_TOKEN_EXPIRES');
    }
    if (!process.env.JWT_VERIFICATION_TOKEN_EXPIRES) {
        throw Error('Missing Env: JWT_VERIFICATION_TOKEN_EXPIRES');
    }
    if (!process.env.JWT_VERIFICATION_TOKEN_SECRET) {
        throw Error('Missing Env: JWT_VERIFICATION_TOKEN_SECRET');
    }
    if (!process.env.DB_HOST) {
        throw Error('Missing Env: DB_HOST');
    }
    if (!process.env.DB_NAME) {
        throw Error('Missing Env: DB_NAME');
    }
    if (!process.env.DB_PASSWORD) {
        throw Error('Missing Env: DB_PASSWORD');
    }
    if (!process.env.DB_PORT) {
        throw Error('Missing Env: DB_PORT');
    }
    if (!process.env.DB_USER) {
        throw Error('Missing Env: DB_USER');
    }
    if (!process.env.AWS_REGION) {
        throw Error('Missing Env: AWS_REGION');
    }
    if (!process.env.AWS_ACCESS_KEY_ID) {
        throw Error('Missing Env: AWS_ACCESS_KEY_ID');
    }
    if (!process.env.AWS_ACCESS_KEY_SECRET) {
        throw Error('Missing Env: AWS_ACCESS_KEY_SECRET');
    }
    if (!process.env.AWS_SENDER_EMAIL) {
        throw Error('Missing Env: AWS_SENDER_EMAIL');
    }

    return {
        database: {
            postgres: {
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT, 10),
                username: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            },
        },
        isDev: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        jwt: {
            access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET,
            access_token_expires: process.env.JWT_ACCESS_TOKEN_EXPIRES,
            verification_token_secret: process.env.JWT_VERIFICATION_TOKEN_SECRET,
            verification_token_expires: process.env.JWT_VERIFICATION_TOKEN_EXPIRES,
            refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET,
            refresh_token_expires: process.env.JWT_REFRESH_TOKEN_EXPIRES,
        },
        AWS: {
            REGION: process.env.AWS_REGION,
            ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
            ACCESS_KEY_SECRET: process.env.AWS_ACCESS_KEY_SECRET,
            SES_SENDER_NAME: process.env.AWS_SENDER_NAME,
            SES_SOURCE_EMAIL: process.env.AWS_SENDER_EMAIL,
        },
    }
}

export default configuration;