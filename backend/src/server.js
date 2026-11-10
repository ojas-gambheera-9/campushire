const mongoose = require('mongoose');
const config = require('./config');
const { createApp } = require('./app');

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  const server = createApp().listen(config.port, () => console.log(`CampusHire API listening on :${config.port}`));
  const shutdown = () => server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => { console.error('Fatal startup error', e); process.exit(1); });
