import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'Banco Aurora', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  clientName!: string;

  @ApiProperty({
    example: 'Precisam de um app de crédito com aprovação em tempo real.',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  painPoint!: string;

  @ApiProperty({ example: '6 semanas', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  declaredDeadline?: string;

  @ApiProperty({ example: 350000, required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiProperty({ example: 'React, NestJS, PostgreSQL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mentionedStack?: string;

  @ApiProperty({ example: 'Maria Souza (CTO)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  decisorName?: string;

  @ApiProperty({
    required: false,
    description: 'Transcript da call (até ~20000 chars)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  transcript?: string;
}
