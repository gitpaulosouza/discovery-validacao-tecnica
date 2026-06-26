import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@prisma-svc/prisma.service';
import { PeopleService } from '@modules/people/services/people.service';
import { BriefHelper, orderedValues } from '@modules/leads/helpers';
import { DecideLeadDto } from '@modules/leads/dtos/decide-lead.dto';
import { LeadDetailResponseDto } from '@modules/leads/dtos/lead-detail-response.dto';

const LEAD_DETAIL_INCLUDE = {
  analysis: {
    include: { extractedNfrs: true, topRisks: true, suggestedSkills: true },
  },
  decision: true,
} satisfies Prisma.LeadInclude;

type LeadWithRelations = Prisma.LeadGetPayload<{
  include: typeof LEAD_DETAIL_INCLUDE;
}>;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly people: PeopleService,
  ) {}

  async findOne(id: string): Promise<LeadDetailResponseDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: LEAD_DETAIL_INCLUDE,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.assembleDetail(lead);
  }

  async decide(id: string, dto: DecideLeadDto): Promise<LeadDetailResponseDto> {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { analysis: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!lead.analysis) {
      throw new BadRequestException('Lead has not been analyzed yet');
    }

    const data = {
      type: dto.type,
      deciderName: dto.deciderName,
      remediationNote:
        dto.type === 'CONDITIONAL' ? (dto.remediationNote ?? null) : null,
      recycleReason:
        dto.type === 'RECYCLE' ? (dto.recycleReason ?? null) : null,
      killReason: dto.type === 'KILL' ? (dto.killReason ?? null) : null,
      killTag: dto.type === 'KILL' ? (dto.killTag ?? null) : null,
    };

    await this.prisma.$transaction([
      this.prisma.decision.upsert({
        where: { leadId: id },
        create: { leadId: id, ...data },
        update: data,
      }),
      this.prisma.lead.update({
        where: { id },
        data: { status: 'DECIDED' },
      }),
    ]);

    return this.findOne(id);
  }

  private async assembleDetail(
    lead: LeadWithRelations,
  ): Promise<LeadDetailResponseDto> {
    const { analysis } = lead;

    const lists = analysis
      ? {
          extractedNfrs: orderedValues(analysis.extractedNfrs),
          topRisks: orderedValues(analysis.topRisks),
          suggestedSkills: orderedValues(analysis.suggestedSkills),
        }
      : null;

    const suggestedSquad =
      analysis && lists
        ? await this.people.suggestSquad(
            lists.suggestedSkills,
            analysis.suggestedSeniority,
          )
        : [];

    return new LeadDetailResponseDto({
      id: lead.id,
      clientName: lead.clientName,
      painPoint: lead.painPoint,
      declaredDeadline: lead.declaredDeadline,
      budget: lead.budget,
      mentionedStack: lead.mentionedStack,
      decisorName: lead.decisorName,
      transcript: lead.transcript,
      status: lead.status,
      createdAt: lead.createdAt,
      analysis:
        analysis && lists
          ? {
              severity: analysis.severity,
              extractedNfrs: lists.extractedNfrs,
              effortMinWeeks: analysis.effortMinWeeks,
              effortMaxWeeks: analysis.effortMaxWeeks,
              confidenceNote: analysis.confidenceNote,
              riskScore: analysis.riskScore,
              topRisks: lists.topRisks,
              suggestedSkills: lists.suggestedSkills,
              suggestedSeniority: analysis.suggestedSeniority,
              slaDeadlineAt: analysis.slaDeadlineAt,
            }
          : null,
      suggestedSquad,
      decision: lead.decision
        ? {
            type: lead.decision.type,
            deciderName: lead.decision.deciderName,
            remediationNote: lead.decision.remediationNote,
            recycleReason: lead.decision.recycleReason,
            killReason: lead.decision.killReason,
            killTag: lead.decision.killTag,
            createdAt: lead.decision.createdAt,
          }
        : null,
      brief:
        analysis && lists
          ? BriefHelper.build({
              severity: analysis.severity,
              extractedNfrs: lists.extractedNfrs,
              topRisks: lists.topRisks,
            })
          : null,
    });
  }
}
