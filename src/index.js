require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const config = require('config');
const memeCommand = require('../config/command/meme-discord-slash.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  // Register the slash command
  const command = {
    name: memeCommand.name,
    description: memeCommand.description,
    options: memeCommand.options
  };

  client.application.commands.set([command])
    .then(() => console.log('Successfully registered slash command'))
    .catch(console.error);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName !== 'meme') return;

  try {
    // Check if guild configuration exists
    const guildConfig = `meme_bot.discord.guild.${interaction.guildId}`;
    if (!config.has(guildConfig)) {
      console.error(`No configuration found for guild ${interaction.guildId}`);
      await interaction.reply({
        content: 'Sorry, this server is not configured for the meme bot. Please contact the bot administrator.',
        flags: [InteractionResponseFlags.Ephemeral]
      });
      return;
    }

    const tokenId = interaction.options.getInteger('dogeid').toString();
    const category = interaction.options.getSubcommand();
    const meme = interaction.options.getString('meme');

    const baseURL = config.get('meme_bot.image_server.base_url');
    const baseGuildURL = baseURL + '/' + config.get(`${guildConfig}.image_server.base_folder_url`);
    const imageURL = baseGuildURL + `/${meme}/` + tokenId + '.png';
    const originalImageURL = baseGuildURL + '/original/' + tokenId + '.png';

    const atUser = `<@${interaction.user.id}>`;
    const categoryMemeDisplayText = getCategoryMemeDisplayText(category, meme);

    const responseConfig = `${guildConfig}.response`;
    const responseConfigDefault = `${responseConfig}.default`;
    const responseConfigCustom = `${responseConfig}.${meme}`;

    // Get default responses
    let content = config.get(`${responseConfigDefault}.content`);
    let title = config.get(`${responseConfigDefault}.title`);
    let description = config.get(`${responseConfigDefault}.description`);
    let footer = config.get(`${responseConfigDefault}.footer`);

    // Try to get custom responses if they exist
    if (config.has(`${responseConfigCustom}.content`)) {
      content = config.get(`${responseConfigCustom}.content`);
    }
    if (config.has(`${responseConfigCustom}.title`)) {
      title = config.get(`${responseConfigCustom}.title`);
    }
    if (config.has(`${responseConfigCustom}.description`)) {
      description = config.get(`${responseConfigCustom}.description`);
    }
    if (config.has(`${responseConfigCustom}.footer`)) {
      footer = config.get(`${responseConfigCustom}.footer`);
    }

    // Apply markup
    content = applyMarkup(content, atUser, tokenId, categoryMemeDisplayText);
    title = applyMarkup(title, atUser, tokenId, categoryMemeDisplayText);
    description = applyMarkup(description, atUser, tokenId, categoryMemeDisplayText);
    footer = applyMarkup(footer, atUser, tokenId, categoryMemeDisplayText);

    console.log("Command Name:", memeCommand.name);
    console.log("Guild ID:", interaction.guildId);
    console.log("Image URL:", imageURL);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x4a48bb)
      .setImage(imageURL)
      .setThumbnail(originalImageURL)
      .setFooter({ text: footer });

    await interaction.reply({
      content: content,
      embeds: [embed]
    });

  } catch (error) {
    console.error('Error processing meme command:', error);
    await interaction.reply({
      content: 'Sorry, there was an error processing your meme command! Please make sure this server is properly configured.',
      flags: [InteractionResponseFlags.Ephemeral]
    });
  }
});

function getCategoryMemeDisplayText(category, meme) {
  const categories = memeCommand.options;
  const filteredCategory = categories.find(item => item.name === category);
  const categoryDisplayName = filteredCategory.description;
  const memes = filteredCategory.options[1].choices;
  const filteredMeme = memes.find(item => item.value === meme);
  const memeDisplayName = filteredMeme.name;
  return `${categoryDisplayName} - ${memeDisplayName}`;
}

function applyMarkup(content, atUser, tokenId, categoryMemeDisplayText) {
  let result = content.replace(/@@AT_USER@@/g, atUser);
  result = result.replace(/@@TOKEN_ID@@/g, tokenId);
  result = result.replace(/@@CATEGORY_MEME_DESCRIPTION@@/g, categoryMemeDisplayText);
  return result;
}

client.login(process.env.DISCORD_TOKEN); 