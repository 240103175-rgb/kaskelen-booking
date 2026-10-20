import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { hashPassword } from './crypto.js';
import { seed } from './domain/seedData.js';
import { createMemoryRepository } from './repositories/memory.js';

const port = Number(process.env.PORT) || 3200;
const isProduction = process.env.NODE_ENV === 'production';

const repo = createMemoryRepository();
if (!isProduction && (await seed(repo, { hashPassword }))) console.log('Seeded synthetic demo data.');

const app = createApp({ repo, staticDir: fileURLToPath(new URL('../../frontend/dist', import.meta.url)) });
app.listen(port, (err) => {
  if (err) {
    console.error(`Cannot start on port ${port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Re:Trace API (${repo.kind} storage) on http://localhost:${port}`);
});
