'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isStaff } = require('../utils/staff.js');
const { errorEmbed, successEmbed } = require('../utils/embed.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WARNS_FILE = path.join(DATA_DIR, 'warns.json');

function loadWarns() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    if (fs.existsSync(WARNS_FILE)) return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
  } catch {}
  return { warns: [] };
}

function saveWarns(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ Avvisa un utente (solo staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Aggiungi un warning a un utente')
      .addUserOption(o => o.setName('user').setDescription('Utente').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Motivo').setRequired(true).setMaxLength(512))
    )
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('Mostra i warning di un utente')
      .addUserOption(o => o.setName('user').setDescription('Utente').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('clear')
      .setDescription('Rimuovi tutti i warning di un utente')
      .addUserOption(o => o.setName('user').setDescription('Utente').setRequired(true))
    ),

  async execute(interaction) {
    if (!isStaff(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Permesso negato', 'Questo comando è riservato allo **staff**.')],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const data = loadWarns();

    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      data.warns.push({
        userId: target.id,
        username: target.username,
        moderatorId: interaction.user.id,
        moderatorName: interaction.user.tag,
        reason,
        ts: Date.now(),
        guildId: interaction.guild.id
      });
      saveWarns(data);

      const total = data.warns.filter(w => w.userId === target.id && w.guildId === interaction.guild.id).length;

      // DM all'utente
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle(`⚠️ Hai ricevuto un warning in ${interaction.guild.name}`)
          .addFields(
            { name: 'Motivo', value: reason, inline: false },
            { name: 'Staff', value: interaction.user.tag, inline: true },
            { name: 'Warning totali', value: String(total), inline: true }
          )
          .setTimestamp();
        await target.send({ embeds: [dmEmbed] });
      } catch {}

      return interaction.reply({
        embeds: [successEmbed('Warning aggiunto',
          `**${target.tag}** ha ricevuto un warning.\n**Totale:** ${total}`
        ).addFields({ name: 'Motivo', value: reason })]
      });
    }

    if (sub === 'list') {
      const warns = data.warns.filter(w => w.userId === target.id && w.guildId === interaction.guild.id);
      if (warns.length === 0) {
        return interaction.reply({
          embeds: [successEmbed('Nessun warning', `**${target.tag}** non ha warning.`)],
          ephemeral: true
        });
      }

      const list = warns.slice(-10).map((w, i) => {
        const date = new Date(w.ts).toLocaleDateString('it-IT');
        return `**#${i + 1}** — \`${date}\` — ${w.reason}\n> da ${w.moderatorName}`;
      }).join('\n\n');

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle(`⚠️ Warning di ${target.tag} (${warns.length})`)
          .setDescription(list)
          .setThumbnail(target.displayAvatarURL())
          .setTimestamp()
        ],
        ephemeral: true
      });
    }

    if (sub === 'clear') {
      const before = data.warns.length;
      data.warns = data.warns.filter(w => !(w.userId === target.id && w.guildId === interaction.guild.id));
      const removed = before - data.warns.length;
      saveWarns(data);

      return interaction.reply({
        embeds: [successEmbed('Warning rimossi',
          `Rimossi **${removed}** warning da **${target.tag}**.`
        )]
      });
    }
  }
};