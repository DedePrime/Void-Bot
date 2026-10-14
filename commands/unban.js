'use strict';
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../utils/staff.js');
const { errorEmbed, successEmbed } = require('../utils/embed.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('🔓 Sbanna un utente dal server (solo staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o =>
      o.setName('user_id')
        .setDescription('L\'ID dell\'utente da sbannare')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Motivo dello sbannamento')
        .setMaxLength(512)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Questo comando è riservato allo **staff**.')],
        ephemeral: true
      });
    }

    const userId = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') || 'Nessun motivo specificato';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({
        embeds: [errorEmbed('ID non valido', 'Inserisci un ID utente Discord valido (17-20 cifre).')],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      // Verifica se è bannato
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return interaction.editReply({
          embeds: [errorEmbed('Non bannato', 'Questo utente non è bannato dal server.')]
        });
      }

      await interaction.guild.members.unban(userId, `${interaction.user.tag}: ${reason}`);

      const embed = successEmbed('Utente sbannato', `**${banInfo.user.tag}** è stato sbannato.`)
        .addFields(
          { name: '👤 Utente', value: `<@${userId}> (\`${userId}\`)`, inline: false },
          { name: '📝 Motivo', value: reason, inline: false },
          { name: '🛡️ Staff', value: `<@${interaction.user.id}>`, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Unban] Errore:', err);
      await interaction.editReply({
        embeds: [errorEmbed('Unban fallito', err.message)]
      });
    }
  }
};