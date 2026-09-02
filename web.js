require('dotenv').config();
const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const startpairing = require('./pair.js');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const pairingRoot = path.join(__dirname, 'kingbadboitimewisher', 'pairing');
const pairingFile = path.join(pairingRoot, 'pairing.json');
let pairingInProgress = false;

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'web')));

function validateNumber(value) {
  let number = String(value || '').trim().replace(/[\s().-]/g, '');
  if (number.startsWith('00')) number = number.slice(2);
  number = number.replace(/^\+/, '').replace(/[^0-9]/g, '');
  if (!number) return { error: 'Please enter your WhatsApp number.' };
  if (number.length < 7 || number.length > 15) return { error: 'Use a valid international WhatsApp number with 7–15 digits.' };
  return { number };
}

async function readPairingCode() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const data = JSON.parse(await fsp.readFile(pairingFile, 'utf8'));
      if (data.error) throw new Error(data.error);
      if (data.code && data.timestamp && Date.now() - new Date(data.timestamp).getTime() < 120000) return data;
    } catch (error) {
      if (error.message && error.message.startsWith('WhatsApp pairing failed:')) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Pairing code was not generated in time.');
}

app.post('/api/pair', async (req, res) => {
  if (pairingInProgress) return res.status(429).json({ error: 'A pairing request is already in progress. Please wait a moment.' });
  const result = validateNumber(req.body?.number);
  if (result.error) return res.status(400).json(result);
  if (os.freemem() / (1024 * 1024) < 300) return res.status(503).json({ error: 'Pairing capacity is currently full. Please try again later.' });

  pairingInProgress = true;
  try {
    await fsp.mkdir(pairingRoot, { recursive: true });
    await fsp.rm(pairingFile, { force: true });
    await startpairing(`${result.number}@s.whatsapp.net`);
    const pairing = await readPairingCode();
    return res.json({ code: pairing.code, number: result.number, expiresIn: 120 });
  } catch (error) {
    console.error('Web pairing error:', error);
    return res.status(500).json({ error: 'Unable to generate a pairing code. Please try again.' });
  } finally {
    pairingInProgress = false;
  }
});

app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'MIANxBADSHAH MD pairing' }));

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'web', 'index.html')));

app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Web pairing interface running on 0.0.0.0:${PORT}`));

module.exports = app;
