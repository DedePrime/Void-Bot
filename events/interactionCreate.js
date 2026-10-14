'use strict';
const { errorEmbed } = require('../utils/embed.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[Void Bot] Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`[Void Bot] Error in ${interaction.commandName}:`, err);

      const embed = errorEmbed('Errore', 'Si è verificato un errore durante l\'esecuzione del comando.');

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      }
    }
  }
};