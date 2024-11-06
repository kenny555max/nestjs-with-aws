// src/lambda/lambda.module.ts
import { Module } from '@nestjs/common';
import { LambdaService } from './lamda.service';

@Module({
    providers: [LambdaService],
    exports: [LambdaService],
})
export class LambdaModule {}