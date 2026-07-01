import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { DECISION_TYPES, KILL_TAGS } from '@modules/leads/constants';
import type { DecisionType, KillTag } from '@modules/leads/constants';

export class DecideLeadDto {
  @ApiProperty({ enum: DECISION_TYPES })
  @IsIn(DECISION_TYPES)
  type!: DecisionType;

  @ApiProperty({ example: 'Carlos Henrique' })
  @IsString()
  @MaxLength(200)
  deciderName!: string;

  @ApiProperty({
    required: false,
    description: 'Usado só se type=CONDITIONAL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remediationNote?: string;

  @ApiProperty({ required: false, description: 'Usado só se type=RECYCLE' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recycleReason?: string;

  @ApiProperty({ required: false, description: 'Usado só se type=KILL' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  killReason?: string;

  @ApiProperty({
    enum: KILL_TAGS,
    required: false,
    description: 'Usado só se type=KILL',
  })
  @IsOptional()
  @IsIn(KILL_TAGS)
  killTag?: KillTag;
}
