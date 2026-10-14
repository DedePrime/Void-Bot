'use strict';
const { PermissionFlagsBits } = require('discord.js');

/**
 * Verifica se un utente è staff del server.
 * Considera staff: admin, moderatori, o utenti con role configurato in ROLE_STAFF.
 */
function isStaff(interaction) {
  // 1) Admin hardcoded nel .env (ADMIN_IDS)
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (adminIds.includes(interaction.user.id)) return true;

  // 2) Permessi Discord
  const perms = interaction.memberPermissions;
  if (perms?.has(PermissionFlagsBits.Administrator)) return true;
  if (perms?.has(PermissionFlagsBits.BanMembers)) return true;
  if (perms?.has(PermissionFlagsBits.KickMembers)) return true;
  if (perms?.has(PermissionFlagsBits.ManageMessages)) return true;

  // 3) Ruolo staff configurato
  if (process.env.ROLE_STAFF && interaction.member?.roles?.cache?.has(process.env.ROLE_STAFF)) {
    return true;
  }

  return false;
}

/**
 * Verifica se un utente è admin (permessi più stretti).
 */
function isAdmin(interaction) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (adminIds.includes(interaction.user.id)) return true;

  const perms = interaction.memberPermissions;
  if (perms?.has(PermissionFlagsBits.Administrator)) return true;

  if (process.env.ROLE_ADMIN && interaction.member?.roles?.cache?.has(process.env.ROLE_ADMIN)) {
    return true;
  }

  return false;
}

module.exports = { isStaff, isAdmin };