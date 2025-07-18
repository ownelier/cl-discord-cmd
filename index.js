const { token, trigger } = require('./config.json');
const { Client } = require('discord.js-selfbot-v13');
const colors = require('colors');
const fetch = require('node-fetch');

const client = new Client();
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function printBanner(usernameTag) {
  console.clear();
  console.log(`
 
        ██████  ▄████▄   ▄▄▄       ██▀███    █████▒▄▄▄       ▄████▄  ▓█████ 
      ▒██    ▒ ▒██▀ ▀█  ▒████▄    ▓██ ▒ ██▒▓██   ▒▒████▄    ▒██▀ ▀█  ▓█   ▀  By teu
      ░ ▓██▄   ▒▓█    ▄ ▒██  ▀█▄  ▓██ ░▄█ ▒▒████ ░▒██  ▀█▄  ▒▓█    ▄ ▒███   
        ▒   ██▒▒▓▓▄ ▄██▒░██▄▄▄▄██ ▒██▀▀█▄  ░▓█▒  ░░██▄▄▄▄██ ▒▓▓▄ ▄██▒▒▓█  ▄ 
      ▒██████▒▒▒ ▓███▀ ░ ▓█   ▓██▒░██▓ ▒██▒░▒█░    ▓█   ▓██▒▒ ▓███▀ ░░▒████▒
      ▒ ▒▓▒ ▒ ░░ ░▒ ▒  ░ ▒▒   ▓▒█░░ ▒▓ ░▒▓░ ▒ ░    ▒▒   ▓▒█░░ ░▒ ▒  ░░░ ▒░ ░
      ░ ░▒  ░ ░  ░  ▒     ▒   ▒▒ ░  ░▒ ░ ▒░ ░       ▒   ▒▒ ░  ░  ▒    ░ ░  ░
      ░  ░  ░  ░          ░   ▒     ░░   ░  ░ ░     ░   ▒   ░           ░   
            ░  ░ ░            ░  ░   ░                  ░  ░░ ░         ░  ░
               ░                                            ░               

`.white);
  console.log(`  - Logado como: ${usernameTag}`.white);
  console.log(`  - cmd: "${trigger}"`.white);
}

async function deleteMessage(channelId, messageId) {
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: token
    }
  });

  if (res.status === 429) {
    const retry = (await res.json()).retry_after;
    console.log(`  Rate Limit: esperando ${retry * 1000}ms`.yellow);
    await wait(retry * 1000);
    return deleteMessage(channelId, messageId);
  }

  return res.ok;
}

async function clearChannel(channelId, authorId) {
  let before = null;
  let totalDeleted = 0;

  while (true) {
    const url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: token }
    });

    if (!res.ok) {
      console.log("Erro ao buscar mensagens".red);
      break;
    }

    const messages = await res.json();
    if (!messages.length) break;

    const userMessages = messages.filter(msg => msg.author.id === authorId && msg.type !== 3);
    if (!userMessages.length) {
      before = messages[messages.length - 1].id;
      continue;
    }

    for (let i = 0; i < userMessages.length; i += 5) {
      const batch = userMessages.slice(i, i + 5);
      const deletions = batch.map(msg =>
        deleteMessage(channelId, msg.id)
          .then(ok => {
            if (ok) {
              console.log(`  ${msg.id} deletada`.white);
              totalDeleted++;
            }
          })
      );
      await Promise.allSettled(deletions);
      await wait(1500);
    }

    before = messages[messages.length - 1].id;
  }

  console.log(`  - Canal limpo — ${totalDeleted} mensagens apagadas`.white);
  printBanner(`${client.user.username}#${client.user.discriminator}`);
}

client.on('ready', () => {
  printBanner(`${client.user.username}#${client.user.discriminator}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return;
  if (message.content.toLowerCase() === trigger) {
    await message.delete().catch(() => {});
    console.log(`  - Iniciando limpeza do canal: ${message.channel.id}`.cyan);
    await clearChannel(message.channel.id, client.user.id);
  }
});

client.login(token);
