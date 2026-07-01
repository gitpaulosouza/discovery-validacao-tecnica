// Internal shapes for the allocation ranking (section 7.3).

export interface SquadCandidate {
  id: string;
  name: string;
  role: string;
  seniority: string;
  skills: string[];
}

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  seniority: string;
  matchedSkills: string[];
}
