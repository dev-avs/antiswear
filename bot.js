require("dotenv").config();
const { Client, GatewayIntentBits, PermissionsBitField } = require("discord.js");
const wordFilter = require("./filter-config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const webhookCache = new Map();

function applyFilter(content) {
  let filtered = content;
  for (const rule of wordFilter) {
    filtered = filtered.replace(rule.match, rule.replace);
  }
  return { filtered, changed: filtered !== content };
}

async function getOrCreateWebhook(channel) {
  if (webhookCache.has(channel.id)) {
    return webhookCache.get(channel.id);
  }

  const existing = await channel.fetchWebhooks();
  let webhook = existing.find(
    (wh) => wh.owner?.id === client.user.id && wh.name === "CleanBot"
  );

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: "CleanBot",
      avatar: client.user.displayAvatarURL(),
      reason: "CleanBot word-filter webhook",
    });
  }

  webhookCache.set(channel.id, webhook);
  return webhook;
}

client.once("ready", () => {
  console.log(`✅ CleanBot is online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (!message.content) return;

  const { filtered, changed } = applyFilter(message.content);
  if (!changed) return; // Nothing to replace

  const me = message.guild.members.me;
  const perms = message.channel.permissionsFor(me);
  if (
    !perms.has(PermissionsBitField.Flags.ManageMessages) ||
    !perms.has(PermissionsBitField.Flags.ManageWebhooks)
  ) {
    console.warn(`⚠️  Missing permissions in #${message.channel.name}`);
    return;
  }

  try {
    await message.delete();

    const member = message.member ?? await message.guild.members.fetch(message.author.id);
    const displayName = member?.displayName ?? message.author.username;
    const avatarURL =
      member?.displayAvatarURL({ size: 256 }) ??
      message.author.displayAvatarURL({ size: 256 });

    const webhook = await getOrCreateWebhook(message.channel);
    await webhook.send({
      content: filtered,
      username: displayName,
      avatarURL: avatarURL,
      threadId: message.channel.isThread() ? message.channel.id : undefined,
    });

    console.log(
      `🧹 Filtered message from ${displayName} in #${message.channel.name}: ` +
      `"${message.content}" → "${filtered}"`
    );
  } catch (err) {
    console.error("❌ Error processing message:", err);
  }
});

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("❌ BOT_TOKEN is not set. Create a .env file with BOT_TOKEN=your_token_here");
  process.exit(1);
}
client.login(token);