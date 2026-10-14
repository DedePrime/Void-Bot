'use strict';
const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const config = require('../config.json');
const { brandEmbed } = require('../utils/embed.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Mostra le informazioni su VoidUtility Bot'),

  async execute(interaction, client) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const embed = brandEmbed(
      `ℹ️ ${config.brandName} Bot`,
      `Bot ufficiale per la gestione delle licenze di **${config.brandName}**.`
    )
    .setThumbnail(config.logoUrl)
    .addFields(
      { name: '📦 Versione', value: '`v1.0.0`', inline: true },
      { name: '🤖 Discord.js', value: `\`${djsVersion}\``, inline: true },
      { name: '📡 Ping', value: `\`${client.ws.ping}ms\``, inline: true },
      { name: '⏱️ Uptime', value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true },
      { name: '🌐 Server', value: `\`${client.guilds.cache.size}\``, inline: true },
      { name: '👥 Utenti', value: `\`${client.users.cache.size}\``, inline: true },
      { name: '🔗 Link', value: `[Sito](${config.websiteUrl}) • [Supporto](${config.supportDiscord})`, inline: false }
    );

    await interaction.reply({ embeds: [embed] });
  }
};