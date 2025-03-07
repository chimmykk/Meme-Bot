// authenticates you with the API standard library
// type `await lib.` to display API autocomplete
const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const memeCommand = require('../../../../config/command/meme-discord-slash.json');
const config = require('config');

var configGuildId = `meme_bot.discord.guild.${context.params.event.guild_id}`;
var tokenId = `${context.params.event.data.options[0].options[0].value}`;

var baseURL = config.get('meme_bot.image_server.base_url');
var baseGuildURL = baseURL + '/' + config.get(configGuildId + '.image_server.base_folder_url');
var imageURL = baseGuildURL + `/${context.params.event.data.options[0].options[1].value}/` + tokenId + '.png';
var originalImageURL = baseGuildURL + '/original/' + tokenId + '.png';

var atUser = `<@${context.params.event.member.user.id}>`;
var category = context.params.event.data.options[0].name;
var meme = context.params.event.data.options[0].options[1].value;
var categoryMemeDisplayText = getCategoryMemeDisplayText(category, meme);

var responseConfig = `meme_bot.discord.guild.${context.params.event.guild_id}.response`;
var responseConfigDefault = `${responseConfig}.default`;
var responseConfigCustom = `${responseConfig}.${meme}`;

var content = config.get(`${responseConfigDefault}.content`);
var title = config.get(`${responseConfigDefault}.title`);
var description = config.get(`${responseConfigDefault}.description`);
var footer = config.get(`${responseConfigDefault}.footer`);

try {
  content = config.get(`${responseConfigCustom}.content`);
} catch(e) {}
try {
  title = config.get(`${responseConfigCustom}.title`);
} catch(e) {}
try {
  description = config.get(`${responseConfigCustom}.description`);
} catch(e) {}
try {
  footer = config.get(`${responseConfigCustom}.footer`);
} catch(e) {}

// apply markup
content = applyMarkup(content, atUser, tokenId, categoryMemeDisplayText);
title = applyMarkup(title, atUser, tokenId, categoryMemeDisplayText);
description = applyMarkup(description, atUser, tokenId, categoryMemeDisplayText);
footer = applyMarkup(footer, atUser, tokenId, categoryMemeDisplayText);

console.log("Comand Name: " + memeCommand.name);
console.log("Image URL: " + imageURL);

return await lib.discord.channels['@0.3.2'].messages.create({
  "channel_id": `${context.params.event.channel_id}`,
  "content": `${content}`,
  "tts": false,
  "embeds": [
    {
      "type": "rich",
      "title": `${title}`,
      "description": `${description}`,
      "color": 0x4a48bb,
      "image": {
        "url": `${imageURL}`,
        "height": 0,
        "width": 0
      },
      "thumbnail": {
        "url": `${originalImageURL}`,
        "height": 0,
        "width": 0
      },
      "footer": {
        "text": `${footer}`
      }
    }
  ]
});

function getCategoryMemeDisplayText(category, meme){
  const categories = memeCommand.options;
  
  var filteredCategory = categories.filter(function (item) {
    return item.name === category;
  });
  
  const categoryDisplayName = filteredCategory[0].description;
  
  const memes = filteredCategory[0].options[1].choices;
  
  var filteredMeme = memes.filter(function (item) {
    return item.value === meme;
  });
  
  const memeDisplayName = filteredMeme[0].name;
  
  return `${categoryDisplayName} - ${memeDisplayName}`;
}

function applyMarkup(content, atUser , tokenId, categoryMemeDisplayText) {  
  var result = replaceAll(content, "@@AT_USER@@", atUser);
  result = replaceAll(result, "@@TOKEN_ID@@", tokenId);
  result = replaceAll(result, "@@CATEGORY_MEME_DESCRIPTION@@", categoryMemeDisplayText);
  return result;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}