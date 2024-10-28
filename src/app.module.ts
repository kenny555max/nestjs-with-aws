import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Question } from './question/entities/question.entity';
import { CycleConfig } from './cycle/config/cycle-config.entity';
import { QuestionService } from './question/question.service';
import { CycleService } from './cycle/cycle.service';
import { QuestionController } from './question/question.controller';
import { CycleUpdateService } from './scheduler/cycle-update.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // Makes ConfigModule globally available
            envFilePath: '.env', // Path to your .env file
        }),
        TypeOrmModule.forFeature([Question, CycleConfig]),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_NAME'),
                entities: [Question, CycleConfig],
                synchronize: false,
                migrations: [__dirname + '/../migrations/*.{ts,js}'],
                migrationsRun: true, // Automatically run migrations on startup
                cli: {
                    migrationsDir: 'src/migrations',
                },
            }),
        }),
    ],
    controllers: [QuestionController],
    providers: [QuestionService, CycleService, CycleUpdateService],
})
export class AppModule {}
