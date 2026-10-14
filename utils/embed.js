'use strict';
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const COLORS = {
  primary: 0x8B5CF6,
  success: 0x10B981,
  error: 0xEF4444,
  warning: 0xF59E0B,
  info: 0x3B82F6
};

function baseEmbed(type = 'primary') {
  return new EmbedBuilder()
    .setColor(COLORS[type] || COLORS.primary)
    .setFooter({ text: config.brandFooter, iconURL: config.logoUrl })
    .setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed('success')
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

function errorEmbed(title, description) {
  return baseEmbed('error')
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

function warningEmbed(title, description) {
  return baseEmbed('warning')
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}

function infoEmbed(title, description) {
  return baseEmbed('info')
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description);
}

function brandEmbed(title, description) {
  return baseEmbed('primary')
    .setTitle(`${title}`)
    .setDescription(description)
    .setThumbnail(config.logoUrl);
}

module.exports = {
  COLORS,
  baseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  infoEmbed,
  brandEmbed
};