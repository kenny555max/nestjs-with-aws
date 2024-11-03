import { Module } from '@nestjs/common';
import { IdentifierService } from './identifier.service';

@Module({
    providers: [IdentifierService],
    exports: [IdentifierService],
})
export class IdentifierModule {}