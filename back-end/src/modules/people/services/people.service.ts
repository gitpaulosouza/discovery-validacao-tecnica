import { Injectable } from '@nestjs/common';

import { PrismaService } from '@prisma-svc/prisma.service';
import { SquadCandidate, SquadMember } from '@modules/people/interfaces';

const MAX_SQUAD_SIZE = 5;

export function rankSquad(
  candidates: SquadCandidate[],
  suggestedSkills: string[],
  suggestedSeniority: string,
): SquadMember[] {
  const wanted = suggestedSkills.map((s) => s.toLowerCase());

  return candidates
    .map((person) => {
      const matchedSkills = person.skills.filter((skill) =>
        wanted.includes(skill.toLowerCase()),
      );
      const seniorityMatch =
        person.seniority.toLowerCase() === suggestedSeniority.toLowerCase();
      return { person, matchedSkills, seniorityMatch };
    })
    .sort((a, b) => {
      if (b.matchedSkills.length !== a.matchedSkills.length) {
        return b.matchedSkills.length - a.matchedSkills.length;
      }
      if (a.seniorityMatch !== b.seniorityMatch) {
        return a.seniorityMatch ? -1 : 1;
      }
      return a.person.name.localeCompare(b.person.name);
    })
    .slice(0, MAX_SQUAD_SIZE)
    .map(({ person, matchedSkills }) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      seniority: person.seniority,
      matchedSkills,
    }));
}

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestSquad(
    suggestedSkills: string[],
    suggestedSeniority: string,
  ): Promise<SquadMember[]> {
    const people = await this.prisma.person.findMany({
      where: { available: true },
      include: { skills: true },
    });

    const candidates: SquadCandidate[] = people.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      seniority: person.seniority,
      skills: person.skills.map((s) => s.value),
    }));

    return rankSquad(candidates, suggestedSkills, suggestedSeniority);
  }
}
