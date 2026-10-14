'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../utils/staff.js');
const { errorEmbed, successEmbed } = require('../utils/embed.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('👢 Espelli un utente dal server (solo staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o =>
      o.setName('user')
        .setDescription('L\'utente da espellere')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Motivo dell\'espulsione')
        .setMaxLength(512)
        .setRequired(false)
    ),

  async execute(interaction, client) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Questo comando è riservato allo **staff**.')],
        ephemeral: true
      });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        embeds: [errorEmbed('Permessi bot', 'Il bot non ha il permesso **Kick Members**.')],
        ephemeral: true
      });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Nessun motivo specificato';

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Errore', 'Non puoi espellere te stesso.')], ephemeral: true });
    }
    if (target.id === client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Errore', 'Non puoi espellere il bot.')], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Errore', 'Utente non trovato nel server.')], ephemeral: true });
    }

    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Errore', 'Non puoi espellere un utente con ruolo uguale o superiore al tuo.')],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      await member.kick(`${interaction.user.tag}: ${reason}`);

      const embed = successEmbed('Utente espulso', `**${target.tag}** è stato espulso dal server.`)
        .addFields(
          { name: '👤 Utente', value: `<@${target.id}>`, inline: false },
          { name: '📝 Motivo', value: reason, inline: false },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Kick] Errore:', err);
      await interaction.editReply({ embeds: [errorEmbed('Kick fallito', err.message)] });
    }
  }
};