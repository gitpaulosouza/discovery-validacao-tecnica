import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LeadsService } from './services/leads.service';
import { PeopleService } from '@modules/people/services/people.service';
import { PrismaService } from '@prisma-svc/prisma.service';

const analysisRow = {
  severity: 'S1',
  effortMinWeeks: 8,
  effortMaxWeeks: 14,
  confidenceNote: 'note',
  riskScore: 75,
  suggestedSeniority: 'Senior',
  slaDeadlineAt: new Date('2026-06-24T00:00:00Z'),
  extractedNfrs: [{ value: 'Conformidade com LGPD', position: 0 }],
  topRisks: [{ value: 'Prazo agressivo', position: 0 }],
  suggestedSkills: [{ value: 'Back-end', position: 0 }],
};

const leadRow = {
  id: 'lead-1',
  clientName: 'Banco Aurora',
  painPoint: 'pain',
  declaredDeadline: '3 semanas',
  budget: 420000,
  mentionedStack: 'NestJS',
  decisorName: null,
  transcript: 'transcript',
  status: 'ANALYZED',
  createdAt: new Date('2026-06-23T00:00:00Z'),
};

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: {
    lead: { findUnique: jest.Mock; update: jest.Mock };
    decision: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let people: { suggestSquad: jest.Mock };

  beforeEach(() => {
    prisma = {
      lead: { findUnique: jest.fn(), update: jest.fn() },
      decision: { upsert: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    people = { suggestSquad: jest.fn().mockResolvedValue([]) };
    service = new LeadsService(
      prisma as unknown as PrismaService,
      people as unknown as PeopleService,
    );
  });

  describe('findOne', () => {
    it('throws NotFound when the lead does not exist', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('assembles analysis lists, squad and brief', async () => {
      prisma.lead.findUnique.mockResolvedValue({
        ...leadRow,
        analysis: analysisRow,
        decision: null,
      });
      people.suggestSquad.mockResolvedValue([
        {
          id: 'p1',
          name: 'Bruno',
          role: 'Tech Lead',
          seniority: 'Senior',
          matchedSkills: ['Back-end'],
        },
      ]);

      const detail = await service.findOne('lead-1');

      expect(detail.analysis?.extractedNfrs).toEqual(['Conformidade com LGPD']);
      expect(people.suggestSquad).toHaveBeenCalledWith(['Back-end'], 'Senior');
      expect(detail.suggestedSquad).toHaveLength(1);
      expect(detail.brief?.scopeMust).toEqual(['Conformidade com LGPD']);
      expect(detail.decision).toBeNull();
    });
  });

  describe('decide', () => {
    it('throws BadRequest when the lead has no analysis', async () => {
      prisma.lead.findUnique.mockResolvedValue({ ...leadRow, analysis: null });
      await expect(
        service.decide('lead-1', { type: 'GO', deciderName: 'Carlos' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persists only the fields relevant to the decision type', async () => {
      // 1st call: decide() guard; 2nd call: findOne() re-read.
      prisma.lead.findUnique
        .mockResolvedValueOnce({ ...leadRow, analysis: analysisRow })
        .mockResolvedValueOnce({
          ...leadRow,
          status: 'DECIDED',
          analysis: analysisRow,
          decision: null,
        });

      await service.decide('lead-1', {
        type: 'KILL',
        deciderName: 'Carlos',
        killReason: 'inviável',
        killTag: 'PRAZO_INVIAVEL',
        remediationNote: 'ignored',
      });

      const killData = {
        type: 'KILL',
        deciderName: 'Carlos',
        remediationNote: null,
        recycleReason: null,
        killReason: 'inviável',
        killTag: 'PRAZO_INVIAVEL',
      };
      expect(prisma.decision.upsert).toHaveBeenCalledWith({
        where: { leadId: 'lead-1' },
        create: { leadId: 'lead-1', ...killData },
        update: killData,
      });
      expect(prisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'DECIDED' },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
