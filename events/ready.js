'use strict';
const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`[Void Bot] Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: '/help • VoidUtility', type: ActivityType.Watching }],
      status: 'online'
    });

    console.log(`[Void Bot] Presence impostata: Watching /help • VoidUtility`);
  }
};