import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                return {
                    type: 'postgres',
                    host: configService.get('database.postgres.host'),
                    port: configService.get('database.postgres.port'),
                    username: configService.get('database.postgres.username'),
                    password: configService.get('database.postgres.password'),
                    database: configService.get('database.postgres.database'),
                    entities: ['dist/**/**/*.entity{.ts,.js}'],
                    migrations: ['dist/database/migrations/*.js'],
                    migrationsTableName: 'migrations_typeorm',
                    // synchronize: configService.get('isDev'),
                    synchronize: true,
                    logging: configService.get('isDev'),
                    subscribers: [],
                };
            },
            inject: [ConfigService],
        }),
    ],
})
export class POSTGRESDatabaseProviderModule {}