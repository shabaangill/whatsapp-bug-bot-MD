// Clean & Readable Command Handler
const fs = require("fs");
const path = require("path");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");

const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

// Default mode
if (!global.mode) global.mode = "self";

// Owner-only commands list
const ownerOnlyCommands = [
  "video2", "song2", "kick", "add", "nice", "tagall",
  "antilink", "antilinkick", "autostatus", "autoreact",
  "autogreet", "autotyping", "autoread", "block", "unblock",
  "shutdown", "restart", "setbio", "setname", "setpp", "save",
  "join", "delaymsg", "del", "reactch", "kickall", "antibug",
  "leave", "open", "close", "tagadmin", "hidetag", "listactive",
  "changename", "closetime", "warn", "promote", "demote",
  "promoteall", "demoteall", "say", "cpp", "harami", "ghostping",
  "adminkill", "delaymsg", "autorerecording", "antidelete"
];

// Load menu.js fallback/media references safely
const menuData = {};
try {
  const menuPath = path.join(__dirname, "..", "media", "menu.js");
  if (fs.existsSync(menuPath)) {
    Object.assign(menuData, require(menuPath));
  }
} catch (err) {
  console.error("❌ Error loading menu.js:", err.message);
}

// Load core.js if it exists
let core;
try {
  const corePath = path.join(__dirname, "./core.js");
  if (fs.existsSync(corePath)) {
    core = require(corePath);
  }
} catch (err) {
  console.error("❌ Error loading core.js:", err.message);
}

// ===============================
// 🔹 MAIN COMMAND HANDLER
// ===============================
async function handleCommand(conn, msg, context = {}) {
  // Use passed context text or extract fallback values directly from message types
  const text = context.text || 
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    "";

  // Check prefix
  if (!text.startsWith(".")) return;

  const parts = text.trim().split(/ +/);
  const command = parts[0].slice(1).toLowerCase();
  const args = parts.slice(1);

  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  
  const senderId = msg.key.fromMe
    ? conn.user.id.split(":")[0] + "@s.whatsapp.net"
    : msg.key.participant || msg.key.remoteJid;

  const senderNum = senderId.replace(/\D/g, "");
  
  // Strict Owner Access Identification Validation
  const isOwner = msg.key.fromMe || senderNum === global.ownerNumber || senderNum === "923143007893";

  const reply = (txt) => conn.sendMessage(chatId, { text: txt }, { quoted: msg });

  // 🔸 Mode control
  if (command === "self") {
    if (!isOwner) return reply("🚫 *Only Owner Can Switch Modes*");
    global.mode = "self";
    return reply(`🔒 *${BOT_NAME.toUpperCase()}* IS NOW IN *SELF MODE* — Only Owner can use me!`);
  }

  if (command === "public") {
    if (!isOwner) return reply("🚫 *Only Owner Can Switch Modes*");
    global.mode = "public";
    return reply(`🌍 *${BOT_NAME.toUpperCase()}* IS NOW IN *PUBLIC MODE* — Everyone can use me!`);
  }

  // 🔸 Mode restrictions
  if (global.mode === "self" && !isOwner && !["menu", "repo", "idcheck", "help", "alive"].includes(command)) {
    return; // Block execution safely
  }

  if (global.mode === "public" && ownerOnlyCommands.includes(command) && !isOwner) {
    return reply("💀 *OWNER ONLY COMMAND!* Access denied.");
  }

  // Native Global Flag Controllers (Quick Switch Actions)
  if (isOwner) {
    if (command === "autoreact") {
      global.autoreact = !global.autoreact;
      return reply(`⚡ *Auto-Reaction Engine:* ${global.autoreact ? "🟢 ENABLED" : "🔴 DISABLED"}`);
    }
    if (command === "autotyping") {
      global.autotyping = !global.autotyping;
      return reply(`✍️ *Auto-Typing Engine:* ${global.autotyping ? "🟢 ENABLED" : "🔴 DISABLED"}`);
    }
    if (command === "autostatus") {
      global.autostatus = !global.autostatus;
      return reply(`👁️ *Auto-Status Viewer:* ${global.autostatus ? "🟢 ENABLED" : "🔴 DISABLED"}`);
    }
    if (command === "antibug") {
      global.antibug = !global.antibug;
      return reply(`🛡️ *Anti-Bug Filter Shield:* ${global.antibug ? "🟢 ENABLED" : "🔴 DISABLED"}`);
    }
  }

  // 🔸 Run the unified command engine
  return runCommand({
    conn,
    msg,
    args,
    command,
    chatId,
    isGroup,
    senderNum,
    reply,
    isOwner
  });
}

// ===============================
// 🔹 COMMAND EXECUTOR
// ===============================
async function runCommand({
  conn,
  msg,
  args,
  command,
  chatId,
  isGroup,
  senderNum,
  reply,
  isOwner
}) {
  try {
    // 🔸 idcheck
    if (command === "idcheck") {
      const botId = conn.user.id || "";
      return reply(
        `🤖 *Bot ID:* ${botId}\n📤 *Sender JID:* ${
          msg.key.participant || msg.key.remoteJid
        }\n🔢 *Sender Clean:* ${senderNum}`
      );
    }

    // 🔸 custom internal fallback helpers
    if (command === "alive") {
      return reply(`✨ *${BOT_NAME} Status* ✨\n\n🟢 *Status:* Active and Operational\n👑 *Owner:* ${OWNER_NAME}\n⚡ *Signature:* ${global.signature || "> 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 𝗕𝗢𝗧 ❦ ✓"}`);
    }

    // 🔸 menu / help dashboard display
    if (command === "menu" || command === "help") {
      if (menuData[command]) {
        const menuMessage = generateWAMessageFromContent(
          chatId,
          { extendedTextMessage: { text: menuData[command] } },
          { userJid: chatId }
        );
        return await conn.relayMessage(chatId, menuMessage.message, { messageId: menuMessage.key.id });
      }

      // Dynamic Integrated Menu Template Structure Display Block
      const menuText = `🤖 *WELCOME TO ${BOT_NAME.toUpperCase()}* 🤖\n` +
                       `_Maintained smoothly by ${OWNER_NAME}_\n\n` +
                       `⚙️ *SYSTEM COMMANDS* ⚙️\n\n` +
                       `• \`.menu\` / \`.help\` — Show helper dashboard\n` +
                       `• \`.alive\` — Response connectivity test\n` +
                       `• \`.idcheck\` — Fetch conversation metadata\n` +
                       `• \`.self\` — Switch bot to single owner use\n` +
                       `• \`.public\` — Authorize public command access\n\n` +
                       
                       `🛠️ *DOWNLOADER COMMANDS* 🛠️\n` +
                       `• \`.tiktok\` — Download TikTok videos\n` +
                       `• \`.fb\` — Download Facebook Reels\n` +
                       `• \`.yt\` — Download YouTube videos\n\n` +
                       
                       `⚙️ *GROUP MODERATION* ⚙️\n` +
                       `• \`.kick\` — Remove a member\n` +
                       `• \`.promote\` — Make a member admin\n\n` +
                       
                       `👑 *OWNER MOD SWITCHES* 👑\n\n` +
                       `• \`.autoreact\` | \`.autotyping\` | \`.autostatus\` | \`.antibug\` | \`.antidelete\`\n\n` +
                       `_${global.signature || "> 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 𝗕𝗢𝗧 ❦ ✓"}_`;

      return reply(menuText);
    }

    // 🔸 antidelete toggle route command integration 
    if (command === "antidelete") {
      if (!isOwner) return reply("🚫 This setting can only be modulated by the system administrator.");
      try {
        const { toggleAntidelete } = require("../antidelete");
        return toggleAntidelete({ conn, m: msg, args, reply, jid: chatId });
      } catch (err) {
        if (global.settings) {
          global.settings.ANTIDELETE = !global.settings.ANTIDELETE;
          return reply(`🗑️ *Anti-Delete Engine:* ${global.settings.ANTIDELETE ? "🟢 ENABLED" : "🔴 DISABLED"}`);
        }
      }
    }

    // 🔸 check core.js functions matrix
    if (core && core[command] && typeof core[command] === "function") {
      return await core[command]({
        conn,
        m: msg,
        args,
        command,
        jid: chatId,
        isGroup,
        sender: senderNum,
        reply
      });
    }

    // 🔸 individual independent modular custom commands route 
    const filePath = path.join(__dirname, "..", `${command}.js`);
    if (fs.existsSync(filePath)) {
      const commandFile = require(filePath);
      if (typeof commandFile === "function") {
        return await commandFile({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
      }
      if (typeof commandFile.run === "function") {
        return await commandFile.run({ conn, m: msg, args, command, jid: chatId, isGroup, sender: senderNum, reply });
      }
    }

    // 🔸 unknown command fallback loop execution
    return reply("*ᴜɴᴋɴᴏᴡɴ ᴄᴏᴍᴍᴀɴᴅ! ᴛʀʏ `.ᴍᴇɴᴜ` ʙᴇꜰᴏʀᴇ sʜᴏᴡɪɴɢ ᴏꜰꜰ 𓄀*");

  } catch (err) {
    console.error("⚠️ Error in command execution:", err);
    return reply("⚠️ Error in command execution!");
  }
}

module.exports = {
  handleCommand
};
        
