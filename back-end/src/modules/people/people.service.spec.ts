import { rankSquad } from './services/people.service';
import { SquadCandidate } from './interfaces';

const candidate = (over: Partial<SquadCandidate>): SquadCandidate => ({
  id: 'id',
  name: 'Someone',
  role: 'Dev',
  seniority: 'Pleno',
  skills: [],
  ...over,
});

describe('rankSquad', () => {
  it('matches skills case-insensitively and reports them', () => {
    const people = [
      candidate({ id: 'a', name: 'Ana', skills: ['React', 'Node'] }),
    ];

    const [member] = rankSquad(people, ['react', 'arquiteto'], 'Pleno');

    expect(member.id).toBe('a');
    expect(member.matchedSkills).toEqual(['React']);
  });

  it('orders by number of matched skills descending', () => {
    const people = [
      candidate({ id: 'few', skills: ['Front-end'] }),
      candidate({ id: 'many', skills: ['Front-end', 'Back-end', 'Arquiteto'] }),
    ];

    const result = rankSquad(
      people,
      ['Front-end', 'Back-end', 'Arquiteto'],
      'Pleno',
    );

    expect(result.map((m) => m.id)).toEqual(['many', 'few']);
  });

  it('breaks ties by matching the suggested seniority', () => {
    const people = [
      candidate({ id: 'junior', seniority: 'Júnior', skills: ['Back-end'] }),
      candidate({ id: 'senior', seniority: 'Senior', skills: ['Back-end'] }),
    ];

    const result = rankSquad(people, ['Back-end'], 'Senior');

    expect(result[0].id).toBe('senior');
  });

  it('returns at most 5 members', () => {
    const people = Array.from({ length: 8 }, (_, i) =>
      candidate({ id: `p${i}`, skills: ['Back-end'] }),
    );

    expect(rankSquad(people, ['Back-end'], 'Pleno')).toHaveLength(5);
  });
});
