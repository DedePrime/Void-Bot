'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const api = require('../utils/api.js');
const { successEmbed, errorEmbed, warningEmbed, brandEmbed } = require('../utils/embed.js');
const config = require('../config.json');

function isStaff(interaction) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.includes(interaction.user.id)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (process.env.ROLE_STAFF && interaction.member?.roles?.cache?.has(process.env.ROLE_STAFF)) return true;
  return false;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function timeLeft(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Scaduta';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}g ${hours}h`;
  return `${hours}h`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('Gestione licenze VoidUtility')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Crea una nuova licenza (staff)')
      .addUserOption(o => o.setName('user').setDescription('Utente a cui assegnare la licenza').setRequired(true))
      .addIntegerOption(o => o.setName('days').setDescription('Durata in giorni (default: 30)').setMinValue(1).setMaxValue(3650))
      .addStringOption(o => o.setName('tier').setDescription('Tier della licenza').addChoices(
        { name: 'Standard', value: 'standard' },
        { name: 'Premium', value: 'premium' },
        { name: 'Lifetime', value: 'lifetime' }
      ))
    )
    .addSubcommand(sub => sub
      .setName('verify')
      .setDescription('Verifica una licenza')
      .addStringOption(o => o.setName('key').setDescription('La chiave da verificare').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('my')
      .setDescription('Mostra le tue licenze')
    )
    .addSubcommand(sub => sub
      .setName('revoke')
      .setDescription('Revoca una licenza (staff)')
      .addStringOption(o => o.setName('key').setDescription('La chiave da revocare').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('reset-hwid')
      .setDescription('Reset HWID di una licenza (staff)')
      .addStringOption(o => o.setName('key').setDescription('La chiave').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ── CREATE ─────────────────────────────────────────
    if (sub === 'create') {
      if (!isStaff(interaction)) {
        return interaction.reply({ embeds: [errorEmbed('Permesso negato', 'Solo lo staff può creare licenze.')], ephemeral: true });
      }

      const target = interaction.options.getUser('user');
      const days = interaction.options.getInteger('days') || config.licenseDurationDays;
      const tier = interaction.options.getString('tier') || 'standard';

      await interaction.deferReply({ ephemeral: true });

      const result = api.createLicense({
        userId: target.id,
        username: target.username,
        durationDays: days,
        tier
      });

      if (!result.ok) {
        return interaction.editReply({ embeds: [warningEmbed('Licenza esistente', result.msg)] });
      }

      const lic = result.license;
      const embed = successEmbed('Licenza creata!', `Licenza generata con successo per <@${target.id}>.`)
        .addFields(
          { name: '🔑 Key', value: `\`\`\`${lic.key}\`\`\``, inline: false },
          { name: '👤 Utente', value: `<@${target.id}>`, inline: true },
          { name: '⏱️ Durata', value: `${lic.durationDays} giorni`, inline: true },
          { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
          { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: false }
        );

      await interaction.editReply({ embeds: [embed] });

      // DM all'utente
      try {
        const dmEmbed = brandEmbed(
          `🎉 Hai ricevuto una licenza ${config.brandName}!`,
          `Ciao <@${target.id}>, ecco la tua chiave di licenza personale.`
        )
        .addFields(
          { name: '🔑 La tua key', value: `\`\`\`${lic.key}\`\`\``, inline: false },
          { name: '⏱️ Durata', value: `${lic.durationDays} giorni`, inline: true },
          { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
          { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: false }
        )
        .setFooter({ text: `Non condividere questa key con nessuno!` });

        await target.send({ embeds: [dmEmbed] });
      } catch {
        // DM chiusi, ignora
      }
      return;
    }

    // ── VERIFY ─────────────────────────────────────────
    if (sub === 'verify') {
      const key = interaction.options.getString('key').trim().toUpperCase();

      await interaction.deferReply({ ephemeral: true });

      const result = api.verifyLicense(key);
      if (!result.ok) {
        return interaction.editReply({ embeds: [errorEmbed('Licenza non valida', result.msg)] });
      }

      const lic = result.license;
      const embed = successEmbed('Licenza valida!', 'La licenza è attiva e funzionante.')
        .addFields(
          { name: '🔑 Key', value: `\`${lic.key}\``, inline: false },
          { name: '👤 Proprietario', value: `<@${lic.userId}>`, inline: true },
          { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
          { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: true },
          { name: '⏱️ Tempo rimasto', value: timeLeft(lic.expiresAt), inline: true },
          { name: '💻 HWID', value: lic.hwid ? `\`${lic.hwid.slice(0, 16)}...\`` : '*Non attivata*', inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── MY ─────────────────────────────────────────────
    if (sub === 'my') {
      await interaction.deferReply({ ephemeral: true });

      const licenses = api.getUserLicense(interaction.user.id);
      if (licenses.length === 0) {
        return interaction.editReply({
          embeds: [warningEmbed('Nessuna licenza', 'Non hai ancora nessuna licenza VoidUtility registrata.')]
        });
      }

      const embed = brandEmbed('🎫 Le tue licenze', `Hai **${licenses.length}** licenza/e registrate.`)
        .setThumbnail(interaction.user.displayAvatarURL());

      licenses.slice(0, 5).forEach((lic, i) => {
        const status = !lic.active ? '❌ Disattivata'
          : lic.expiresAt < Date.now() ? '⌛ Scaduta'
          : '✅ Attiva';

        embed.addFields({
          name: `#${i + 1} — ${lic.key}`,
          value: [
            `**Stato:** ${status}`,
            `**Tier:** ${lic.tier.toUpperCase()}`,
            `**Creata:** ${formatDate(lic.createdAt)}`,
            `**Scade:** ${formatDate(lic.expiresAt)}`,
            `**Rimane:** ${timeLeft(lic.expiresAt)}`
          ].join('\n'),
          inline: false
        });
      });

      if (licenses.length > 5) {
        embed.setFooter({ text: `Mostrate 5 di ${licenses.length} licenze.` });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── REVOKE ─────────────────────────────────────────
    if (sub === 'revoke') {
      if (!isStaff(interaction)) {
        return interaction.reply({ embeds: [errorEmbed('Permesso negato', 'Solo lo staff può revocare licenze.')], ephemeral: true });
      }

      const key = interaction.options.getString('key').trim().toUpperCase();
      await interaction.deferReply({ ephemeral: true });

      const result = api.revokeLicense(key);
      if (!result.ok) {
        return interaction.editReply({ embeds: [errorEmbed('Errore', result.msg)] });
      }

      return interaction.editReply({
        embeds: [successEmbed('Licenza revocata', `La licenza \`${key}\` è stata disattivata.`)]
      });
    }

    // ── RESET HWID ─────────────────────────────────────
    if (sub === 'reset-hwid') {
      if (!isStaff(interaction)) {
        return interaction.reply({ embeds: [errorEmbed('Permesso negato', 'Solo lo staff può resettare HWID.')], ephemeral: true });
      }

      const key = interaction.options.getString('key').trim().toUpperCase();
      await interaction.deferReply({ ephemeral: true });

      const result = api.resetHwid(key);
      if (!result.ok) {
        return interaction.editReply({ embeds: [errorEmbed('Errore', result.msg)] });
      }

      return interaction.editReply({
        embeds: [successEmbed('HWID resettato', `La licenza \`${key}\` può ora essere riattivata su un altro PC.`)]
      });
    }
  }
};