const { Client, GatewayIntentBits, AttachmentBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require('path');

// Bot token
const TOKEN = '';


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI("Your Gemini API key");

// Discord bot configuration
const PREFIX = '!doge';
const DOGES_FOLDER = 'C:\\Users\\hp\\Downloads\\generative-meme\\dogeimage\\';

// Setup slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('doge')
    .setDescription('Generate a modified doge image')
    .addIntegerOption(option => 
      option.setName('dogeid')
        .setDescription('The doge image number (0, 1, 2, etc.)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('prompt')
        .setDescription('What you want to add to the doge (e.g., "add a red cap")')
        .setRequired(true))
];

// Initialize REST for slash commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Register slash commands when the bot is ready
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(command => command.toJSON()) }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'doge') {
    await interaction.deferReply();
    
    const dogeNumber = interaction.options.getInteger('dogeid');
    const prompt = interaction.options.getString('prompt');
    
    try {
      // Construct the image path with user-provided number
      const imagePath = path.join(DOGES_FOLDER, `${dogeNumber}.png`);
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        return interaction.editReply(`Error: Doge image #${dogeNumber} not found!`);
      }
      
      // Load the image
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');
      
      // Prepare the content parts with user prompt
      const contents = [
        { text: `make this doge ${prompt}` },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Image
          }
        }
      ];
      
      // Initialize model with image generation capabilities
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
          responseModalities: ['Text', 'Image']
        },
      });
      
      // Generate content
      const response = await model.generateContent(contents);
      
      let hasImage = false;
      for (const part of response.response.candidates[0].content.parts) {
        if (part.text) {
          console.log(part.text);
        } else if (part.inlineData) {
          hasImage = true;
          const outputImageData = part.inlineData.data;
          const buffer = Buffer.from(outputImageData, 'base64');
          
          // Save image temporarily
          const outputPath = './gemini-doge-output.png';
          fs.writeFileSync(outputPath, buffer);
          
          // Create Discord attachment and send
          const attachment = new AttachmentBuilder(outputPath, { name: 'doge-edited.png' });
          await interaction.editReply({ 
            content: `Here's your custom doge!`,
            files: [attachment] 
          });
          
          // Delete the temporary file
          fs.unlinkSync(outputPath);
        }
      }
      
      if (!hasImage) {
        await interaction.editReply('Sorry, I couldn\'t generate an image from your request.');
      }
      
    } catch (error) {
      console.error("Error generating content:", error);
      interaction.editReply(`Something went wrong: ${error.message}`);
    }
  }
});

// Keep the legacy text command support
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;
  
  // Check if the message starts with the prefix
  if (!message.content.startsWith(PREFIX)) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(' ');
  const dogeNumber = args.shift();
  const prompt = args.join(' ');
  
  if (!dogeNumber || !prompt) {
    return message.reply('Please use the format: `!doge [number] [prompt]` (e.g., `!doge 0 add a red cap`)');
  }
  
  try {
    // Send a "processing" message
    const processingMsg = await message.channel.send('🔄 Processing your doge request...');
    
    // Construct the image path with user-provided number
    const imagePath = path.join(DOGES_FOLDER, `${dogeNumber}.png`);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return message.reply(`Error: Doge image #${dogeNumber} not found!`);
    }
    
    // Load the image
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    
    // Prepare the content parts with user prompt
    const contents = [
      { text: `make this doge ${prompt}` },
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      }
    ];
    
    // Initialize model with image generation capabilities
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        responseModalities: ['Text', 'Image']
      },
    });
    
    // Generate content
    const response = await model.generateContent(contents);
    
    let hasImage = false;
    for (const part of response.response.candidates[0].content.parts) {
      if (part.text) {
        console.log(part.text);
      } else if (part.inlineData) {
        hasImage = true;
        const outputImageData = part.inlineData.data;
        const buffer = Buffer.from(outputImageData, 'base64');
        
        // Save image temporarily
        const outputPath = './gemini-doge-output.png';
        fs.writeFileSync(outputPath, buffer);
        
        // Create Discord attachment and send
        const attachment = new AttachmentBuilder(outputPath, { name: 'doge-edited.png' });
        await message.channel.send({ 
          content: `Here's your custom doge, ${message.author}!`,
          files: [attachment] 
        });
        
        // Delete the temporary file
        fs.unlinkSync(outputPath);
      }
    }
    
    if (!hasImage) {
      await message.channel.send('Sorry, I couldn\'t generate an image from your request.');
    }
    
    // Delete the processing message
    await processingMsg.delete();
    
  } catch (error) {
    console.error("Error generating content:", error);
    message.reply(`Something went wrong: ${error.message}`);
  }
});


client.login(TOKEN);
