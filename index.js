'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

// ── Porta dinamica di Render ────────────────────────────
const PORT = process.env.PORT || 3000;

// ── Client Discord ──────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

client.commands = new Collection();
client.config = config;

// ── Carica comandi ─────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[Void Bot] Loaded command: ${command.data.name}`);
      } else {
        console.warn(`[Void Bot] Command at ${filePath} missing "data" or "execute"`);
      }
    } catch (err) {
      console.error(`[Void Bot] Failed to load ${file}:`, err.message);
    }
  }
}

// ── Carica eventi ──────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      console.log(`[Void Bot] Loaded event: ${event.name}`);
    } catch (err) {
      console.error(`[Void Bot] Failed to load event ${file}:`, err.message);
    }
  }
}

// ── Health check HTTP server (per Render + UptimeRobot) ─
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      bot: client.user ? client.user.tag : 'starting'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[Void Bot] Health check server in ascolto sulla porta ${PORT}`);
});

// ── Errori globali ─────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('[Void Bot] Unhandled rejection:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('[Void Bot] Uncaught exception:', err?.message || err);
});

// ── Login ──────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Void Bot] ERRORE: DISCORD_TOKEN mancante.');
  process.exit(1);
}

client.once('clientReady', () => {
  console.log(`[Void Bot] Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: '/help • VoidUtility', type: ActivityType.Watching }],
    status: 'online'
  });
});

client.login(token);