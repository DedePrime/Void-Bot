'use strict';
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const api = require('../utils/api.js');
const config = require('../config.json');

// ── Verifica se l'utente è staff ────────────────────────
function isStaff(interaction) {
  const adminIds = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.includes(interaction.user.id)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (process.env.ROLE_STAFF && interaction.member?.roles?.cache?.has(process.env.ROLE_STAFF)) return true;
  return false;
}

// ── Formattazione data ──────────────────────────────────
function formatDate(ts) {
  return new Date(ts).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Tempo rimanente ─────────────────────────────────────
function tempoRimanente(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Scaduta';
  const g = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return g > 0 ? `${g}g ${h}h` : `${h}h`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('license')
    .setDescription('🎫 Gestione licenze VoidUtility')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Crea una nuova licenza (staff)')
      .addUserOption(o => o.setName('utente').setDescription('Utente a cui assegnare la licenza').setRequired(true))
      .addIntegerOption(o => o.setName('giorni').setDescription('Durata in giorni (default: 30)').setMinValue(1).setMaxValue(3650).setRequired(false))
      .addStringOption(o => o.setName('tier').setDescription('Tier della licenza').setRequired(false).addChoices(
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
    console.log(`[License] Sub-comando: ${sub} da ${interaction.user.tag}`);

    // ═══════════════════════════════════════════════════
    //  CREATE
    // ═══════════════════════════════════════════════════
    if (sub === 'create') {
      try {
        console.log('[License/Create] ▶ Inizio');
        console.log('[License/Create] User ID:', interaction.user.id);
        console.log('[License/Create] Admin IDs configurati:', process.env.ADMIN_IDS);
        console.log('[License/Create] Role staff configurato:', process.env.ROLE_STAFF);

        if (!isStaff(interaction)) {
          console.log('[License/Create] ❌ Permesso negato');
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Permesso negato').setDescription('Solo lo **staff** può creare licenze.')],
            ephemeral: true
          });
        }
        console.log('[License/Create] ✅ Staff verificato');

        const target = interaction.options.getUser('utente');
        const giorni = interaction.options.getInteger('giorni') || config.licenseDurationDays || 30;
        const tier = interaction.options.getString('tier') || 'standard';

        console.log('[License/Create] Target:', target.id, target.tag);
        console.log('[License/Create] Giorni:', giorni, '| Tier:', tier);

        await interaction.deferReply({ ephemeral: true });
        console.log('[License/Create] DeferReply OK');

        let result;
        try {
          result = api.createLicense({
            userId: target.id,
            username: target.username,
            durationDays: giorni,
            tier
          });
          console.log('[License/Create] Result:', JSON.stringify(result));
        } catch (apiErr) {
          console.error('[License/Create] ❌ api.createLicense error:', apiErr.message);
          console.error(apiErr.stack);
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor(0xEF4444)
              .setTitle('❌ Errore interno')
              .setDescription(`\`\`\`${apiErr.message}\`\`\``)
            ]
          });
        }

        if (!result.ok) {
          console.log('[License/Create] ⚠️ Licenza esistente');
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(0xF59E0B).setTitle('⚠️ Licenza esistente').setDescription(result.msg || 'Utente ha già una licenza attiva.')]
          });
        }

        const lic = result.license;
        console.log('[License/Create] ✅ Licenza creata:', lic.key);

        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Licenza creata!')
            .setDescription(`Licenza generata per <@${target.id}>.`)
            .addFields(
              { name: '🔑 Key', value: `\`\`\`${lic.key}\`\`\``, inline: false },
              { name: '👤 Utente', value: `<@${target.id}>`, inline: true },
              { name: '⏱️ Durata', value: `${lic.durationDays} giorni`, inline: true },
              { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
              { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: false }
            )
            .setTimestamp()
          ]
        });
        console.log('[License/Create] ✅ Reply inviata');

        // DM all'utente
        try {
          await target.send({
            embeds: [new EmbedBuilder()
              .setColor(0x8B5CF6)
              .setTitle(`🎉 Hai ricevuto una licenza ${config.brandName}!`)
              .setDescription('Ecco la tua chiave personale. **Non condividerla con nessuno!**')
              .addFields(
                { name: '🔑 Key', value: `\`\`\`${lic.key}\`\`\``, inline: false },
                { name: '⏱️ Durata', value: `${lic.durationDays} giorni`, inline: true },
                { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
                { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: false }
              )
              .setTimestamp()
            ]
          });
          console.log('[License/Create] ✅ DM inviato a', target.tag);
        } catch (dmErr) {
          console.log('[License/Create] ⚠️ DM non inviato:', dmErr.message);
        }

        return;
      } catch (err) {
        console.error('[License/Create] ❌❌ ERRORE GENERALE:', err.message);
        console.error(err.stack);
        try {
          if (interaction.deferred) {
            await interaction.editReply({
              embeds: [new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('❌ Errore')
                .setDescription(`\`\`\`${err.message}\`\`\``)
              ]
            });
          } else {
            await interaction.reply({
              embeds: [new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('❌ Errore')
                .setDescription(`\`\`\`${err.message}\`\`\``)
              ],
              ephemeral: true
            });
          }
        } catch (replyErr) {
          console.error('[License/Create] ❌ Anche la reply è fallita:', replyErr.message);
        }
        return;
      }
    }

    // ═══════════════════════════════════════════════════
    //  VERIFY
    // ═══════════════════════════════════════════════════
    if (sub === 'verify') {
      try {
        const key = interaction.options.getString('key').trim().toUpperCase();
        await interaction.deferReply({ ephemeral: true });

        const result = api.verifyLicense(key);
        if (!result.ok) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Licenza non valida').setDescription(result.msg)]
          });
        }

        const lic = result.license;
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('✅ Licenza valida!')
            .addFields(
              { name: '🔑 Key', value: `\`${lic.key}\``, inline: false },
              { name: '👤 Proprietario', value: `<@${lic.userId}>`, inline: true },
              { name: '⭐ Tier', value: lic.tier.toUpperCase(), inline: true },
              { name: '📅 Scade il', value: formatDate(lic.expiresAt), inline: true },
              { name: '⏱️ Tempo rimasto', value: tempoRimanente(lic.expiresAt), inline: true },
              { name: '💻 HWID', value: lic.hwid ? `\`${lic.hwid.slice(0, 16)}...\`` : '*Non attivata*', inline: true }
            )
            .setTimestamp()
          ]
        });
      } catch (err) {
        console.error('[License/Verify] Errore:', err.message);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(err.message)]
        });
      }
    }

    // ═══════════════════════════════════════════════════
    //  MY
    // ═══════════════════════════════════════════════════
    if (sub === 'my') {
      try {
        await interaction.deferReply({ ephemeral: true });

        const licenze = api.getUserLicense(interaction.user.id);
        if (licenze.length === 0) {
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle('⚠️ Nessuna licenza')
              .setDescription('Non hai ancora nessuna licenza VoidUtility.')
            ]
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x8B5CF6)
          .setTitle('🎫 Le tue licenze')
          .setDescription(`Hai **${licenze.length}** licenza/e registrate.`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setTimestamp();

        licenze.slice(0, 5).forEach((lic, i) => {
          const stato = !lic.active ? '❌ Disattivata'
            : lic.expiresAt < Date.now() ? '⌛ Scaduta'
            : '✅ Attiva';

          embed.addFields({
            name: `#${i + 1} — ${lic.key}`,
            value: [
              `**Stato:** ${stato}`,
              `**Tier:** ${lic.tier.toUpperCase()}`,
              `**Creata:** ${formatDate(lic.createdAt)}`,
              `**Scade:** ${formatDate(lic.expiresAt)}`,
              `**Rimane:** ${tempoRimanente(lic.expiresAt)}`
            ].join('\n'),
            inline: false
          });
        });

        if (licenze.length > 5) {
          embed.setFooter({ text: `Mostrate 5 di ${licenze.length} licenze.` });
        }

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[License/My] Errore:', err.message);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(err.message)]
        });
      }
    }

    // ═══════════════════════════════════════════════════
    //  REVOKE
    // ═══════════════════════════════════════════════════
    if (sub === 'revoke') {
      try {
        if (!isStaff(interaction)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Permesso negato').setDescription('Solo lo **staff** può revocare licenze.')],
            ephemeral: true
          });
        }

        const key = interaction.options.getString('key').trim().toUpperCase();
        await interaction.deferReply({ ephemeral: true });

        const result = api.revokeLicense(key);
        if (!result.ok) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(result.msg)]
          });
        }

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0x10B981).setTitle('✅ Licenza revocata').setDescription(`La licenza \`${key}\` è stata disattivata.`)]
        });
      } catch (err) {
        console.error('[License/Revoke] Errore:', err.message);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(err.message)]
        });
      }
    }

    // ═══════════════════════════════════════════════════
    //  RESET HWID
    // ═══════════════════════════════════════════════════
    if (sub === 'reset-hwid') {
      try {
        if (!isStaff(interaction)) {
          return interaction.reply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Permesso negato').setDescription('Solo lo **staff** può resettare HWID.')],
            ephemeral: true
          });
        }

        const key = interaction.options.getString('key').trim().toUpperCase();
        await interaction.deferReply({ ephemeral: true });

        const result = api.resetHwid(key);
        if (!result.ok) {
          return interaction.editReply({
            embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(result.msg)]
          });
        }

        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0x10B981).setTitle('✅ HWID resettato').setDescription(`La licenza \`${key}\` può essere riattivata su un altro PC.`)]
        });
      } catch (err) {
        console.error('[License/ResetHwid] Errore:', err.message);
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor(0xEF4444).setTitle('❌ Errore').setDescription(err.message)]
        });
      }
    }
  }
};