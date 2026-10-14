'use strict';
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const http = require('http');
const wokeDyno = require('woke-dyno');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');

// ── Configurazione Porta (Render la fornisce dinamicamente) ──
const PORT = process.env.PORT || 3000;
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
    // Non serve altro per gli slash commands!
    // GuildMembers e MessageContent richiedono privileged intents
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
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`[Void Bot] Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[Void Bot] Command at ${filePath} missing "data" or "execute"`);
    }
  }
}

// ── Carica eventi ──────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[Void Bot] Loaded event: ${event.name}`);
  }
}

// ── Server HTTP per Health Check (Render) ────────────────
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      bot: client.user ? client.user.tag : 'starting'
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[Void Bot] Health check server in ascolto sulla porta ${PORT}`);
});

// ── Errori globali ─────────────────────────────────────
process.on('unhandledRejection', (err) => {
  console.error('[Void Bot] Unhandled rejection:', err.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('[Void Bot] Uncaught exception:', err.message || err);
});

// ── Login ──────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('[Void Bot] ERRORE: DISCORD_TOKEN mancante nel file .env');
  process.exit(1);
}

client.once('clientReady', () => {
  console.log(`[Void Bot] Logged in as ${client.user.tag}`);

  // Avvia il keep-alive di Render
  if (process.env.NODE_ENV === 'production' || SELF_URL.includes('onrender.com')) {
    try {
      const dynoWaker = wokeDyno(SELF_URL);
      dynoWaker.start();
      console.log(`[Void Bot] Keep-alive attivato per ${SELF_URL}`);
    } catch (e) {
      console.warn('[Void Bot] Keep-alive non avviato:', e.message);
    }
  }
});

client.login(token);