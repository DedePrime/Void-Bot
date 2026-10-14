'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { brandEmbed } = require('../utils/embed.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra tutti i comandi di VoidUtility Bot'),

  async execute(interaction) {
    const embed = brandEmbed(
      `📖 ${config.brandName} Bot — Comandi`,
      `Ecco tutti i comandi disponibili.`
    )
    .addFields(
      {
        name: '🎫 Licenze',
        value: [
          '`/license create` — Crea licenza *(staff)*',
          '`/license verify <key>` — Verifica una key',
          '`/license my` — Le tue licenze',
          '`/license revoke <key>` — Revoca *(staff)*',
          '`/license reset-hwid <key>` — Reset HWID *(staff)*'
        ].join('\n'),
        inline: false
      },
      {
        name: '👤 Utente',
        value: [
          '`/verify <key>` — Attiva licenza sul tuo account',
          '`/info` — Info sul bot'
        ].join('\n'),
        inline: false
      },
      {
        name: '🛡️ Moderazione (solo staff)',
        value: [
          '`/serverstats` — 📊 Statistiche dettagliate server',
          '`/ban <user> [motivo] [giorni]` — 🔨 Banna utente',
          '`/unban <user_id> [motivo]` — 🔓 Sbanna utente',
          '`/kick <user> [motivo]` — 👢 Espelli utente',
          '`/warn add <user> <motivo>` — ⚠️ Avvisa utente',
          '`/warn list <user>` — 📋 Lista warning',
          '`/warn clear <user>` — 🧹 Rimuovi warning',
          '`/stats` — 📈 Statistiche licenze'
        ].join('\n'),
        inline: false
      },
      {
        name: '🔗 Link',
        value: `[Sito](${config.websiteUrl}) • [Supporto](${config.supportDiscord})`,
        inline: false
      }
    )
    .setThumbnail(config.logoUrl);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};