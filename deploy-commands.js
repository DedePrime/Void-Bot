'use strict';
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`[Deploy] Preparato: /${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

if (!process.env.CLIENT_ID) {
  console.error('\n❌ CLIENT_ID mancante nel .env\n');
  process.exit(1);
}
if (!process.env.DISCORD_TOKEN) {
  console.error('\n❌ DISCORD_TOKEN mancante nel .env\n');
  process.exit(1);
}

(async () => {
  try {
    console.log(`\n[Deploy] Client ID: ${process.env.CLIENT_ID}`);

    // ✅ STEP 1: Cancella TUTTI i comandi vecchi (guild + globali) per evitare duplicati
    if (process.env.GUILD_ID) {
      console.log(`[Deploy] Pulizia comandi guild vecchi...`);
      try {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          { body: [] }
        );
        console.log('[Deploy] ✅ Comandi guild cancellati');
      } catch (e) {
        console.warn('[Deploy] Errore pulizia guild:', e.message);
      }
    }

    console.log(`[Deploy] Pulizia comandi globali vecchi...`);
    try {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: [] }
      );
      console.log('[Deploy] ✅ Comandi globali cancellati');
    } catch (e) {
      console.warn('[Deploy] Errore pulizia globali:', e.message);
    }

    // ✅ STEP 2: Registra i comandi nuovi
    let route;
    let mode;
    if (process.env.GUILD_ID && process.env.GUILD_ID.trim()) {
      console.log(`[Deploy] Modalità GUILD → ${process.env.GUILD_ID}`);
      route = Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID);
      mode = 'guild';
    } else {
      console.log(`[Deploy] Modalità GLOBAL`);
      route = Routes.applicationCommands(process.env.CLIENT_ID);
      mode = 'global';
    }

    console.log(`[Deploy] Registro ${commands.length} comandi...`);
    const data = await rest.put(route, { body: commands });
    console.log(`\n[Deploy] ✅ ${data.length} comandi registrati (${mode})!`);

    console.log('\n📋 Comandi registrati:');
    data.forEach(c => console.log(`   • /${c.name} — ${c.description}`));

    if (mode === 'global') {
      console.log('\nℹ️  I comandi globali possono impiegare fino a 1 ora per apparire.');
      console.log('ℹ️  Per testarli subito, aggiungi GUILD_ID nel .env e ri-esegui.\n');
    } else {
      console.log('\n⚠️  IMPORTANTE: Riavvia Discord (Ctrl+R) per vedere i comandi aggiornati!\n');
    }
  } catch (err) {
    console.error('\n❌ [Deploy] Errore:', err.code || err.message);
    if (err.code === 50001) {
      console.error('\n🔍 CAUSA: "Missing Access"');
      console.error('   Il bot NON è nel server con GUILD_ID specificato,');
      console.error('   oppure non ha lo scope "applications.commands".\n');
    }
    if (err.code === 401) {
      console.error('\n🔍 DISCORD_TOKEN non valido.\n');
    }
  }
})();