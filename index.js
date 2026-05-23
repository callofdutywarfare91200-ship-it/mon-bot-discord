require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AuditLogEvent } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

// IDs des salons
const LOGS_ROLES = '1507450432216236083';
const LOGS_VOCAL = '1507451538451464222';
const LOGS_MODERATION = '1507452118074785922';
const LOGS_MEMBRES = '1507452452889170100';
const BOT_COMMANDES = '1507468511851577444';

const commands = [
  new SlashCommandBuilder()
    .setName('expulser')
    .setDescription('Expulser un membre du serveur')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à expulser').setRequired(true)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban un membre')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à ban').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban un membre')
    .addStringOption(option => option.setName('id').setDescription('L\'ID du membre à unban').setRequired(true)),
  new SlashCommandBuilder()
    .setName('avertir')
    .setDescription('Avertir un membre du serveur')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à avertir').setRequired(true))
    .addStringOption(option => option.setName('raison').setDescription('La raison').setRequired(false)),
  new SlashCommandBuilder()
    .setName('reglement')
    .setDescription('Envoyer le règlement dans le salon règlement'),
  new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche toutes les commandes disponibles'),
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands enregistrées !');
  } catch (error) {
    console.error(error);
  }
});

// Quand quelqu'un rejoint
client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.get('1506035394288943208');
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle('👋 Nouveau membre !')
      .setColor(0x00ff00)
      .setDescription(`Bienvenue sur **${member.guild.name}**, ${member} !\nLis le règlement et amuse-toi bien 🎮`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Membre', value: `${member.user.tag}`, inline: true },
        { name: '👥 Nombre de membres', value: `${member.guild.memberCount}`, inline: true },
        { name: '📅 Compte créé le', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:D>`, inline: true }
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();
    channel.send({ embeds: [embed] });
  }
  const logChannel = member.guild.channels.cache.get(LOGS_MEMBRES);
  if (logChannel) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Membre rejoint')
      .setColor(0x00ff00)
      .setDescription(`${member} a rejoint le serveur`)
      .addFields({ name: 'ID', value: member.id })
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }
});

// Quand quelqu'un quitte
client.on('guildMemberRemove', (member) => {
  console.log(`${member.user.tag} a quitté le serveur`);
  const channel = member.guild.channels.cache.get('1506328557465370644');
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle('👋 Au revoir !')
      .setColor(0xff0000)
      .setDescription(`**${member.user.tag}** a quitté le serveur.\nOn espère te revoir bientôt !`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '👤 Membre', value: `${member.user.tag}`, inline: true },
        { name: '👥 Membres restants', value: `${member.guild.memberCount}`, inline: true }
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();
    channel.send({ embeds: [embed] });
  }
  const logChannel = member.guild.channels.cache.get(LOGS_MEMBRES);
  if (logChannel) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Membre parti')
      .setColor(0xff0000)
      .setDescription(`**${member.user.tag}** a quitté le serveur`)
      .addFields({ name: 'ID', value: member.id })
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }
});

// Logs vocal
client.on('voiceStateUpdate', async (oldState, newState) => {
  const logChannel = newState.guild.channels.cache.get(LOGS_VOCAL);
  if (!logChannel) return;
  const member = newState.member;

  if (!oldState.channelId && newState.channelId) {
    const embed = new EmbedBuilder()
      .setTitle('🎤 Rejoint un vocal')
      .setColor(0x00aaff)
      .setDescription(`${member} a rejoint **${newState.channel.name}**`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  } else if (oldState.channelId && !newState.channelId) {
    await new Promise(r => setTimeout(r, 500));
    const auditLogs = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberDisconnect, limit: 1 });
    const entry = auditLogs.entries.first();
    const wasDisconnected = entry && (Date.now() - entry.createdTimestamp < 3000);
    const embed = new EmbedBuilder().setColor(0xff6600).setTimestamp();
    if (wasDisconnected) {
      embed.setTitle('🔌 Déconnecté du vocal');
      embed.setDescription(`${member} a été déconnecté de **${oldState.channel.name}** par **${entry.executor.tag}**`);
    } else {
      embed.setTitle('🔇 Quitté un vocal');
      embed.setDescription(`${member} a quitté **${oldState.channel.name}**`);
    }
    logChannel.send({ embeds: [embed] });
  } else if (oldState.channelId !== newState.channelId) {
    await new Promise(r => setTimeout(r, 500));
    const auditLogs = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberMove, limit: 1 });
    const entry = auditLogs.entries.first();
    const wasMoved = entry && (Date.now() - entry.createdTimestamp < 3000);
    const embed = new EmbedBuilder().setColor(0xffff00).setTimestamp();
    if (wasMoved) {
      embed.setTitle('🔀 Déplacé dans un vocal');
      embed.setDescription(`${member} a été déplacé de **${oldState.channel.name}** vers **${newState.channel.name}** par **${entry.executor.tag}**`);
    } else {
      embed.setTitle('🔀 Changé de vocal');
      embed.setDescription(`${member} est passé de **${oldState.channel.name}** à **${newState.channel.name}**`);
    }
    logChannel.send({ embeds: [embed] });
  }

  if (!oldState.serverMute && newState.serverMute) {
    await new Promise(r => setTimeout(r, 500));
    const auditLogs = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 });
    const entry = auditLogs.entries.first();
    const embed = new EmbedBuilder()
      .setTitle('🔇 Mis en sourdine')
      .setColor(0xff0000)
      .setDescription(`${member} a été mis en sourdine${entry ? ` par **${entry.executor.tag}**` : ''}`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }

  if (oldState.serverMute && !newState.serverMute) {
    const embed = new EmbedBuilder()
      .setTitle('🔊 Sourdine retirée')
      .setColor(0x00ff00)
      .setDescription(`${member} n'est plus en sourdine`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }

  if (!oldState.serverDeaf && newState.serverDeaf) {
    await new Promise(r => setTimeout(r, 500));
    const auditLogs = await newState.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 1 });
    const entry = auditLogs.entries.first();
    const embed = new EmbedBuilder()
      .setTitle('✂️ Micro coupé')
      .setColor(0xff0000)
      .setDescription(`${member} a eu son micro coupé${entry ? ` par **${entry.executor.tag}**` : ''}`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }

  if (oldState.serverDeaf && !newState.serverDeaf) {
    const embed = new EmbedBuilder()
      .setTitle('🎙️ Micro rétabli')
      .setColor(0x00ff00)
      .setDescription(`${member} a retrouvé son micro`)
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }
});

// Logs rôles
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const logChannel = newMember.guild.channels.cache.get(LOGS_ROLES);
  if (!logChannel) return;

  const rolesAdded = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const rolesRemoved = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (rolesAdded.size > 0) {
    const auditLogs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 1 });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry ? auditEntry.executor : null;
    const embed = new EmbedBuilder()
      .setTitle('✅ Rôle attribué')
      .setColor(0x00ff00)
      .setDescription(`${newMember} a reçu le rôle **${rolesAdded.first().name}**`)
      .addFields({ name: 'Attribué par', value: executor ? `${executor}` : 'Inconnu' })
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }

  if (rolesRemoved.size > 0) {
    const auditLogs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 1 });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry ? auditEntry.executor : null;
    const embed = new EmbedBuilder()
      .setTitle('❌ Rôle retiré')
      .setColor(0xff0000)
      .setDescription(`${newMember} a perdu le rôle **${rolesRemoved.first().name}**`)
      .addFields({ name: 'Retiré par', value: executor ? `${executor}` : 'Inconnu' })
      .setTimestamp();
    logChannel.send({ embeds: [embed] });
  }
});

// Interactions
client.on('interactionCreate', async (interaction) => {

  if (interaction.isButton() && interaction.customId === 'accepter_reglement') {
    const member = interaction.member;
    const roleMembre = interaction.guild.roles.cache.find(r => r.name === 'Membre');
    if (roleMembre) await member.roles.add(roleMembre);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('role_homme').setLabel('Homme').setStyle(ButtonStyle.Primary).setEmoji('👨'),
      new ButtonBuilder().setCustomId('role_femme').setLabel('Femme').setStyle(ButtonStyle.Danger).setEmoji('👩'),
    );
    await interaction.reply({ content: `Règlement accepté ! Choisis maintenant ton genre :`, components: [row], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'role_homme') {
    const role = interaction.guild.roles.cache.find(r => r.name === 'Homme');
    if (role) await interaction.member.roles.add(role);
    await interaction.reply({ content: `Rôle **Homme** attribué ! Bienvenue sur le serveur 🎮`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'role_femme') {
    const role = interaction.guild.roles.cache.find(r => r.name === 'Femme');
    if (role) await interaction.member.roles.add(role);
    await interaction.reply({ content: `Rôle **Femme** attribué ! Bienvenue sur le serveur 🎮`, ephemeral: true });
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== 'reglement' && interaction.commandName !== 'aide' && interaction.channelId !== BOT_COMMANDES) {
    return interaction.reply({ content: `❌ Les commandes ne sont autorisées que dans <#${BOT_COMMANDES}> !`, ephemeral: true });
  }

  if (interaction.commandName === 'aide') {
    const embed = new EmbedBuilder()
      .setTitle('📋 Liste des commandes')
      .setColor(0x5865F2)
      .addFields(
        { name: '👢 /expulser', value: 'Expulser un membre du serveur' },
        { name: '🔨 /ban', value: 'Bannir un membre du serveur' },
        { name: '✅ /unban', value: 'Unbannir un membre (ID requis)' },
        { name: '⚠️ /avertir', value: 'Avertir un membre avec une raison' },
        { name: '📜 /reglement', value: 'Envoyer le règlement (Admin uniquement)' },
        { name: '📋 /aide', value: 'Afficher cette liste de commandes' },
      )
      .setFooter({ text: 'Les commandes sont réservées aux modérateurs.' })
      .setTimestamp();
    interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === 'reglement') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: 'Tu n\'as pas la permission.', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('📜 Règlement du serveur')
      .setColor(0x5865F2)
      .setDescription(
        `➥ **1 : Respect**\nRespectez tous les membres. Aucun harcèlement, insultes, discrimination ou propos offensants.\n\n` +
        `➥ **2 : Confidentialité**\nNe partagez pas d'informations personnelles.\n\n` +
        `➥ **3 : Contenu**\nPas de contenu pornographique ou offensant.\n\n` +
        `➥ **4 : Publicité**\nToute publicité ou promotion est interdite sans autorisation.`
      )
      .setFooter({ text: 'En cliquant sur ✅ tu acceptes le règlement.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accepter_reglement').setLabel('J\'accepte ✅').setStyle(ButtonStyle.Success),
    );
    await interaction.reply({ content: 'Règlement envoyé !', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }

  if (interaction.commandName === 'expulser') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission d\'expulser.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    await target.kick();
    interaction.reply(`**${target.user.tag}** a été expulsé.`);
    const logChannel = interaction.guild.channels.cache.get(LOGS_MODERATION);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('👢 Membre expulsé')
        .setColor(0xff6600)
        .setDescription(`**${target.user.tag}** a été expulsé par ${interaction.member}`)
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }
  }

  if (interaction.commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission de ban.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    await target.ban();
    interaction.reply(`**${target.user.tag}** a été ban.`);
    const logChannel = interaction.guild.channels.cache.get(LOGS_MODERATION);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🔨 Membre banni')
        .setColor(0xff0000)
        .setDescription(`**${target.user.tag}** a été banni par ${interaction.member}`)
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }
  }

  if (interaction.commandName === 'unban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission de unban.', ephemeral: true });
    const userId = interaction.options.getString('id');
    try {
      await interaction.guild.members.unban(userId);
      interaction.reply(`Le membre a été unban.`);
      const logChannel = interaction.guild.channels.cache.get(LOGS_MODERATION);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Membre unban')
          .setColor(0x00ff00)
          .setDescription(`Le membre avec l'ID **${userId}** a été unban par ${interaction.member}`)
          .setTimestamp();
        logChannel.send({ embeds: [embed] });
      }
    } catch (e) {
      interaction.reply({ content: 'ID invalide ou membre pas banni.', ephemeral: true });
    }
  }

  if (interaction.commandName === 'avertir') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission d\'avertir.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
    interaction.reply(`**${target.user.tag}** a reçu un avertissement : *${raison}*`);
    const logChannel = interaction.guild.channels.cache.get(LOGS_MODERATION);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Membre averti')
        .setColor(0xffff00)
        .setDescription(`**${target.user.tag}** a été averti par ${interaction.member}`)
        .addFields({ name: 'Raison', value: raison })
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }
  }
});

client.login(process.env.TOKEN);