import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export enum SortOrderEnum {
    ASC = 'ASC',
    DESC = 'DESC',
}
export class QueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value)) // Transform string to number
    page?: number = 1;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value)) // Transform string to number
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sort?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({
        enum: SortOrderEnum,
        enumName: 'SortOrder',
        example: SortOrderEnum.ASC,
    })
    @IsOptional()
    @IsEnum(SortOrderEnum)
    sortOrder?: SortOrderEnum;
}
