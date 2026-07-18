require('dotenv').config();

const { createClient } = require('./wa');
const { startServer } = require('./server');

const client = createClient();
startServer();
client.initialize().catch((err) => {
  console.error('failed to initialize WhatsApp client:', err);
  process.exit(1);
});
