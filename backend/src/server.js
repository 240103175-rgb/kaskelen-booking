import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createMemoryRepository } from './repositories/memory.js';
import { createSqlRepository } from './repositories/sql.js';
import { seed } from './seedData.js';

const port = Number(process.env.PORT) || 3100;
const isProduction = process.env.NODE_ENV === 'production';

// STORAGE=memory keeps everything in RAM (iteration 3); the default is the ORM over DATABASE_URL.
const repo = process.env.STORAGE === 'memory' ? createMemoryRepository() : await createSqlRepository();
if (!isProduction && (await seed(repo))) console.log('Seeded demo venues.');

const app = createApp({
  repo,
  devCodes: !isProduction,
  staticDir: fileURLToPath(new URL('../../frontend/dist', import.meta.url)),
});
app.listen(port, (err) => {
  if (err) {
    console.error(`Cannot start on port ${port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Kaskelen Booking API (${repo.kind} storage) on http://localhost:${port}`);
});
