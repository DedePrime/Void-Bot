'use strict';
const { SlashCommandBuilder, ChannelType, EmbedBuilder, version: djsVersion } = require('discord.js');
const { isStaff } = require('../utils/staff.js');
const { errorEmbed } = require('../utils/embed.js');
const config = require('../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('📊 Mostra statistiche dettagliate del server (solo staff)'),

  async execute(interaction, client) {
    // 🔒 Solo staff
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Questo comando è riservato allo **staff**.')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({ embeds: [errorEmbed('Errore', 'Comando disponibile solo nei server.')] });
    }

    // ── Fetch completo ──────────────────────────────
    await guild.members.fetch();
    await guild.channels.fetch();

    const members = guild.members.cache;

    // ── Conteggi ────────────────────────────────────
    const totalMembers = guild.memberCount;
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;
    const online = members.filter(m => m.presence?.status === 'online').size;
    const idle = members.filter(m => m.presence?.status === 'idle').size;
    const dnd = members.filter(m => m.presence?.status === 'dnd').size;
    const offline = totalMembers - online - idle - dnd;

    const boosters = members.filter(m => m.premiumSince).size;
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    // ── Canali ──────────────────────────────────────
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;

    // ── Ruoli ───────────────────────────────────────
    const roles = guild.roles.cache.size - 1; // -1 per @everyone
    const topRoles = guild.roles.cache
      .filter(r => r.id !== guild.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .first(5)
      .map(r => `<@&${r.id}> (${r.members.size})`)
      .join('\n') || 'Nessuno';

    // ── Emoji e sticker ─────────────────────────────
    const emojis = guild.emojis.cache.size;
    const stickers = guild.stickers.cache.size;

    // ── Età server ──────────────────────────────────
    const createdTs = Math.floor(guild.createdTimestamp / 1000);
    const ageDays = Math.floor((Date.now() - guild.createdTimestamp) / 86400000);

    // ── Embed ───────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`📊 Statistiche di ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256, dynamic: true }))
      .setFooter({ text: config.brandFooter, iconURL: config.logoUrl })
      .setTimestamp()
      .addFields(
        {
          name: '👥 Membri',
          value: [
            `**Totale:** ${totalMembers}`,
            `**Umani:** ${humans}`,
            `**Bot:** ${bots}`
          ].join('\n'),
          inline: true
        },
        {
          name: '🟢 Presenze',
          value: [
            `🟢 Online: ${online}`,
            `🟡 Idle: ${idle}`,
            `🔴 DND: ${dnd}`,
            `⚫ Offline: ${offline}`
          ].join('\n'),
          inline: true
        },
        {
          name: '💎 Boost',
          value: [
            `**Livello:** ${boostLevel}`,
            `**Boost:** ${boostCount}`,
            `**Booster:** ${boosters}`
          ].join('\n'),
          inline: true
        },
        {
          name: '💬 Canali',
          value: [
            `**Testuali:** ${textChannels}`,
            `**Vocali:** ${voiceChannels}`,
            `**Forum:** ${forumChannels}`,
            `**Categorie:** ${categories}`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎭 Ruoli',
          value: `**Totale:** ${roles}`,
          inline: true
        },
        {
          name: '😀 Emoji & Sticker',
          value: `**Emoji:** ${emojis}\n**Sticker:** ${stickers}`,
          inline: true
        },
        {
          name: '🏆 Top 5 Ruoli',
          value: topRoles,
          inline: false
        },
        {
          name: '📅 Server creato',
          value: `<t:${createdTs}:F>\n(${ageDays} giorni fa)`,
          inline: false
        }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};