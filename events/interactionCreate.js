'use strict';
const { EmbedBuilder } = require('discord.js');

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

    console.log(`\n[Interaction] ▶ /${interaction.commandName} da ${interaction.user.tag}`);
    if (interaction.options?.data?.length > 0) {
      console.log('[Interaction] Opzioni:', JSON.stringify(interaction.options.data.map(o => ({ name: o.name, value: o.value }))));
    }

    try {
      await command.execute(interaction, client);
      console.log(`[Interaction] ✅ /${interaction.commandName} completato`);
    } catch (err) {
      console.error(`[Interaction] ❌ ERRORE /${interaction.commandName}`);
      console.error('[Interaction] Message:', err.message);
      console.error('[Interaction] Stack:', err.stack);

      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ Errore')
        .setDescription(`\`\`\`${err.message || 'Errore sconosciuto'}\`\`\``)
        .setFooter({ text: 'VoidUtility • Debug' })
        .setTimestamp();

      try {
        if (interaction.replied) {
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else if (interaction.deferred) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (replyErr) {
        console.error('[Interaction] ❌ Anche la reply è fallita:', replyErr.message);
      }
    }
  }
};