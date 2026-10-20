import { createMemoryRepository } from '../src/repositories/memory.js';
import { seed } from '../src/seedData.js';
import { localToUtc } from '../src/time.js';

export const TODAY = '2026-10-13';
export const TOMORROW = '2026-10-14';
// 10:00 in Kaskelen on TODAY.
export const NOW = localToUtc(TODAY, 10);

/** Storage implementations every service and API test runs against. */
export const REPOSITORIES = {
  memory: async () => createMemoryRepository(),
};

export async function setup(makeRepo = REPOSITORIES.memory) {
  const repo = await makeRepo();
  await seed(repo, NOW);
  const owner = await repo.findUserByPhone('+77010000001');
  const venues = await repo.listVenues();
  const venue = venues.find((v) => v.name === 'Арена Қаскелең');
  const [pitch, pitch2] = await repo.listResources(venue.id);
  const pool = venues.find((v) => v.category === 'pool');
  const [lane] = await repo.listResources(pool.id);
  let n = 0;
  const addUser = (phone = `+7701999${String(n++).padStart(4, '0')}`, role = 'player') =>
    repo.createUser({ phone, name: 'Test', role, lang: 'kk', createdAt: NOW });
  const player = await addUser('+77011111111');
  const player2 = await addUser('+77012222222');
  return { repo, owner, venue, pitch, pitch2, pool, lane, player, player2, addUser };
}
