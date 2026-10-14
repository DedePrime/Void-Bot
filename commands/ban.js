'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../utils/staff.js');
const { errorEmbed, successEmbed } = require('../utils/embed.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('🔨 Banna un utente dal server (solo staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o =>
      o.setName('user')
        .setDescription('L\'utente da bannare')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Motivo del ban')
        .setMaxLength(512)
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName('delete_days')
        .setDescription('Elimina i messaggi degli ultimi X giorni (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction, client) {
    // 🔒 Solo staff
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Questo comando è riservato allo **staff**.')],
        ephemeral: true
      });
    }

    // 🔒 Il bot deve avere il permesso
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        embeds: [errorEmbed('Permessi bot', 'Il bot non ha il permesso **Ban Members**.')],
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Nessun motivo specificato';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    // ❌ Non puoi bannare te stesso
    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Errore', 'Non puoi bannare te stesso.')],
        ephemeral: true
      });
    }

    // ❌ Non puoi bannare il bot
    if (target.id === client.user.id) {
      return interaction.reply({
        embeds: [errorEmbed('Errore', 'Non puoi bannare il bot.')],
        ephemeral: true
      });
    }

    // ❌ Non puoi bannare un admin
    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (targetMember && targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [errorEmbed('Errore', 'Non puoi bannare un amministratore.')],
        ephemeral: true
      });
    }

    // ❌ Non puoi bannare qualcuno con ruolo più alto del tuo
    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Errore', 'Non puoi bannare un utente con ruolo uguale o superiore al tuo.')],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      // Prova a inviare DM all'utente prima del ban
      let dmSent = false;
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle(`🔨 Sei stato bannato da ${interaction.guild.name}`)
          .addFields(
            { name: 'Motivo', value: reason, inline: false },
            { name: 'Staff', value: `${interaction.user.tag}`, inline: true }
          )
          .setFooter({ text: config.brandFooter })
          .setTimestamp();
        await target.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch { dmSent = false; }

      // Esegui il ban
      await interaction.guild.members.ban(target.id, {
        reason: `${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteDays * 86400
      });

      const embed = successEmbed('Utente bannato', `**${target.tag}** è stato bannato dal server.`)
        .addFields(
          { name: '👤 Utente', value: `<@${target.id}> (\`${target.id}\`)`, inline: false },
          { name: '📝 Motivo', value: reason, inline: false },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true },
          { name: '💬 DM inviato', value: dmSent ? '✅ Sì' : '❌ No (DM chiusi)', inline: true },
          { name: '🗑️ Messaggi eliminati', value: `${deleteDays} giorni`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });

      // 📋 Log nel canale configurato
      await sendLog(client, {
        action: 'BAN',
        color: 0xEF4444,
        target,
        moderator: interaction.user,
        reason,
        extra: deleteDays > 0 ? `Messaggi eliminati: ultimi ${deleteDays} giorni` : null
      });

    } catch (err) {
      console.error('[Ban] Errore:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Ban fallito', `Impossibile bannare l'utente: ${err.message}`)]
      });
    }
  }
};

/**
 * Invia il log nel canale configurato (LOG_CHANNEL_ID nel .env)
 */
async function sendLog(client, { action, color, target, moderator, reason, extra }) {
  try {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;

    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📋 Moderation Log — ${action}`)
      .addFields(
        { name: '👤 Target', value: `<@${target.id}> (\`${target.tag}\`)`, inline: false },
        { name: '🛡️ Moderatore', value: `<@${moderator.id}> (\`${moderator.tag}\`)`, inline: true },
        { name: '📝 Motivo', value: reason || 'Nessuno', inline: true }
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    if (extra) embed.addFields({ name: 'ℹ️ Extra', value: extra, inline: false });

    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.warn('[Log] Impossibile inviare log:', e.message);
  }
}