import { createApp } from './app.js';
import { openDb } from './db.js';
import { seed } from './seed.js';

const port = Number(process.env.PORT) || 3100;
const isProduction = process.env.NODE_ENV === 'production';

const db = openDb();
if (!isProduction && seed(db)) console.log('Seeded demo venues.');

const app = createApp({ db, showDevCode: !isProduction });
app.listen(port, (err) => {
  if (err) {
    console.error(`Cannot start on port ${port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Kaskelen Booking is running on http://localhost:${port}`);
});
