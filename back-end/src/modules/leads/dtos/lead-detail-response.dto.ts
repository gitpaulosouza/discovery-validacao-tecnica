import { ApiProperty } from '@nestjs/swagger';

import {
  AnalysisResult,
  Brief,
  DecisionResult,
  LeadDetailResult,
} from '@modules/leads/interfaces';
import { SquadMember } from '@modules/people/interfaces';

export class AnalysisView implements AnalysisResult {
  @ApiProperty({
    example: 'S1',
    description: 'Severidade calculada (S1/S2/S3)',
  })
  severity!: string;

  @ApiProperty({
    type: [String],
    description: 'NFRs implícitas extraídas pelo agente',
    example: ['Conformidade com LGPD', 'SLA / disponibilidade comprometida'],
  })
  extractedNfrs!: string[];

  @ApiProperty({ example: 8, description: 'Estimativa mínima em semanas' })
  effortMinWeeks!: number;

  @ApiProperty({ example: 14, description: 'Estimativa máxima em semanas' })
  effortMaxWeeks!: number;

  @ApiProperty({ description: 'Nota de confiança da estimativa' })
  confidenceNote!: string;

  @ApiProperty({ example: 75, description: 'Score de risco (0-100)' })
  riskScore!: number;

  @ApiProperty({ type: [String], description: 'Top 3 riscos identificados' })
  topRisks!: string[];

  @ApiProperty({ type: [String], description: 'Skills sugeridas para o squad' })
  suggestedSkills!: string[];

  @ApiProperty({ example: 'Senior', description: 'Senioridade sugerida' })
  suggestedSeniority!: string;

  @ApiProperty({ description: 'Prazo de SLA (ISO)' })
  slaDeadlineAt!: Date;
}

export class DecisionView implements DecisionResult {
  @ApiProperty({
    example: 'KILL',
    description: 'GO | CONDITIONAL | RECYCLE | KILL',
  })
  type!: string;

  @ApiProperty({ example: 'Carlos Henrique', description: 'Quem decidiu' })
  deciderName!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Só para CONDITIONAL',
  })
  remediationNote!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Só para RECYCLE' })
  recycleReason!: string | null;

  @ApiProperty({ nullable: true, type: String, description: 'Só para KILL' })
  killReason!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Tag do critério de Kill',
  })
  killTag!: string | null;

  @ApiProperty({ description: 'Quando a decisão foi registrada (ISO)' })
  createdAt!: Date;
}

export class LeadDetailResponseDto implements LeadDetailResult {
  @ApiProperty({
    format: 'uuid',
    example: 'dcf8ff33-f2d2-4aab-89df-4e003d329cab',
  })
  id!: string;

  @ApiProperty({ example: 'Banco Aurora', description: 'Nome do cliente' })
  clientName!: string;

  @ApiProperty({ description: 'Dor declarada pelo cliente' })
  painPoint!: string;

  @ApiProperty({ nullable: true, type: String, example: '3 semanas' })
  declaredDeadline!: string | null;

  @ApiProperty({ nullable: true, type: Number, example: 420000 })
  budget!: number | null;

  @ApiProperty({ nullable: true, type: String, example: 'React, NestJS' })
  mentionedStack!: string | null;

  @ApiProperty({ nullable: true, type: String })
  decisorName!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Transcript da call',
  })
  transcript!: string | null;

  @ApiProperty({
    example: 'ANALYZED',
    description: 'PENDING_ANALYSIS | ANALYZED | DECIDED',
  })
  status!: string;

  @ApiProperty({ description: 'Criação do lead (ISO)' })
  createdAt!: Date;

  @ApiProperty({ type: AnalysisView, nullable: true })
  analysis!: AnalysisResult | null;

  @ApiProperty({
    isArray: true,
    description: 'Squad sugerida pelo hub de alocação',
  })
  suggestedSquad!: SquadMember[];

  @ApiProperty({ type: DecisionView, nullable: true })
  decision!: DecisionResult | null;

  @ApiProperty({
    nullable: true,
    description: 'Brief de saída (Definition of Ready)',
  })
  brief!: Brief | null;

  constructor(props: LeadDetailResult) {
    Object.assign(this, props);
  }
}
