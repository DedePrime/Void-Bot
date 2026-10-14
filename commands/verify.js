'use strict';
const { SlashCommandBuilder } = require('discord.js');
const api = require('../utils/api.js');
const { successEmbed, errorEmbed } = require('../utils/embed.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verifica e collega una licenza VoidUtility al tuo account Discord')
    .addStringOption(o =>
      o.setName('key')
        .setDescription('La chiave di licenza (formato VOID-XXXX-XXXX-XXXX-XXXX)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const key = interaction.options.getString('key').trim().toUpperCase();

    await interaction.deferReply({ ephemeral: true });

    const result = api.verifyLicense(key);
    if (!result.ok) {
      return interaction.editReply({ embeds: [errorEmbed('Licenza non valida', result.msg)] });
    }

    const lic = result.license;

    if (lic.userId !== interaction.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed('Licenza di un altro utente', 'Questa licenza appartiene a un altro account Discord.')]
      });
    }

    // Assegna il ruolo (fetch per sicurezza)
    if (process.env.ROLE_LICENSE && interaction.guild) {
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(process.env.ROLE_LICENSE);
      } catch (e) {
        console.warn('[Verify] Impossibile aggiungere ruolo:', e.message);
      }
    }

    const embed = successEmbed(
      'Licenza verificata!',
      `Benvenuto in **VoidUtility**, <@${interaction.user.id}>! 🎉`
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: '🔑 Key', value: `\`${lic.key}\``, inline: false },
      { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
      { name: '📅 Scade il', value: new Date(lic.expiresAt).toLocaleDateString('it-IT'), inline: true }
    )
    .setFooter({ text: 'Ora puoi scaricare VoidUtility dal sito ufficiale!' });

    return interaction.editReply({ embeds: [embed] });
  }
};