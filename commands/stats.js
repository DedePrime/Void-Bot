'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const api = require('../utils/api.js');
const { brandEmbed, errorEmbed } = require('../utils/embed.js');
const config = require('../config.json');

function isStaff(interaction) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.includes(interaction.user.id)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (process.env.ROLE_STAFF && interaction.member?.roles?.cache?.has(process.env.ROLE_STAFF)) return true;
  return false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra le statistiche di VoidUtility (staff)'),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Solo lo staff può vedere le statistiche.')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const stats = api.getStats();

    const embed = brandEmbed(
      `📊 ${config.brandName} — Statistiche`,
      `Panoramica completa delle licenze registrate.`
    )
    .addFields(
      { name: '🎫 Licenze totali', value: `\`${stats.total}\``, inline: true },
      { name: '✅ Attive', value: `\`${stats.active}\``, inline: true },
      { name: '⌛ Scadute', value: `\`${stats.expired}\``, inline: true },
      { name: '❌ Revocate', value: `\`${stats.revoked}\``, inline: true },
      { name: '💻 HWID vincolati', value: `\`${stats.bound}\``, inline: true },
      { name: '🆓 Libere', value: `\`${stats.free}\``, inline: true }
    );

    if (stats.history.length > 0) {
      const recent = stats.history.slice(0, 5).map(h => {
        const time = new Date(h.ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const actionMap = {
          create: '🆕 Creata',
          activate: '🔓 Attivata',
          reset_hwid: '🔄 Reset HWID',
          revoke: '❌ Revocata'
        };
        return `\`${time}\` ${actionMap[h.action] || h.action} \`${h.key.slice(0, 20)}...\``;
      }).join('\n');

      embed.addFields({ name: '📜 Attività recente', value: recent, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};