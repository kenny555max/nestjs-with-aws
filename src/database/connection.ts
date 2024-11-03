/**
 * @file connection.ts
 * @description Establishes a TypeORM connection to PostgreSQL.
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * @method typeOrmConfig
 * @description Generates configuration for TypeORM using environment variables.
 * @returns {TypeOrmModuleOptions} TypeORM configuration object.
 */
export const typeOrmConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
};
