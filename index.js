require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

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
    channel.send(`Bienvenue sur le serveur **${member.guild.name}**, ${member} ! Lis le règlement et amuse-toi bien !`);
  }
});

// Message d'au revoir
client.on('guildMemberRemove', (member) => {
  console.log(`${member.user.tag} a quitté le serveur`);
  const channel = member.guild.channels.cache.get('1506328557465370644');
  console.log('Salon trouvé :', channel ? channel.name : 'NON TROUVÉ');
  if (channel) {
    channel.send(`Au revoir **${member.user.tag}**, on espère te revoir bientôt ! 👋`);
  }
});

// Interactions (boutons + slash commands)
client.on('interactionCreate', async (interaction) => {

  // Bouton : accepter le règlement
  if (interaction.isButton() && interaction.customId === 'accepter_reglement') {
    const member = interaction.member;
    const roleMembre = interaction.guild.roles.cache.find(r => r.name === 'Membre');
    if (roleMembre) await member.roles.add(roleMembre);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('role_homme').setLabel('Homme').setStyle(ButtonStyle.Primary).setEmoji('👨'),
      new ButtonBuilder().setCustomId('role_femme').setLabel('Femme').setStyle(ButtonStyle.Danger).setEmoji('👩'),
    );

    await interaction.reply({
      content: `Règlement accepté ! Choisis maintenant ton genre :`,
      components: [row],
      ephemeral: true
    });
  }

  // Bouton : choisir Homme
  if (interaction.isButton() && interaction.customId === 'role_homme') {
    const role = interaction.guild.roles.cache.find(r => r.name === 'Homme');
    if (role) await interaction.member.roles.add(role);
    await interaction.reply({ content: `Rôle **Homme** attribué ! Bienvenue sur le serveur 🎮`, ephemeral: true });
  }

  // Bouton : choisir Femme
  if (interaction.isButton() && interaction.customId === 'role_femme') {
    const role = interaction.guild.roles.cache.find(r => r.name === 'Femme');
    if (role) await interaction.member.roles.add(role);
    await interaction.reply({ content: `Rôle **Femme** attribué ! Bienvenue sur le serveur 🎮`, ephemeral: true });
  }

  if (!interaction.isChatInputCommand()) return;

  // Commande /reglement
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

  // Commande /expulser
  if (interaction.commandName === 'expulser') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission d\'expulser.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    await target.kick();
    interaction.reply(`**${target.user.tag}** a été expulsé.`);
  }

  // Commande /ban
  if (interaction.commandName === 'ban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission de ban.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    await target.ban();
    interaction.reply(`**${target.user.tag}** a été ban.`);
  }

  // Commande /unban
  if (interaction.commandName === 'unban') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission de unban.', ephemeral: true });
    const userId = interaction.options.getString('id');
    try {
      await interaction.guild.members.unban(userId);
      interaction.reply(`Le membre a été unban.`);
    } catch (e) {
      interaction.reply({ content: 'ID invalide ou membre pas banni.', ephemeral: true });
    }
  }

  // Commande /avertir
  if (interaction.commandName === 'avertir') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return interaction.reply({ content: 'Tu n\'as pas la permission d\'avertir.', ephemeral: true });
    const target = interaction.options.getMember('membre');
    const raison = interaction.options.getString('raison') || 'Aucune raison fournie';
    interaction.reply(`**${target.user.tag}** a reçu un avertissement : *${raison}*`);
  }
});

client.login(process.env.TOKEN);