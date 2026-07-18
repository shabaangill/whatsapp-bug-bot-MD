// 📂 File: antidelete.js
// 🛡️ Ultra Pro Max Anti-Delete System — SHABAAN BOT

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "delete.json");
const toggleFile = path.join(__dirname, "antidelete.json");

// ✅ Load or initialize toggles
let toggles = {};
if (fs.existsSync(toggleFile)) {
  try {
    toggles = JSON.parse(fs.readFileSync(toggleFile, "utf-8"));
  } catch (err) {
    console.error("⚠️ Error parsing antidelete.json:", err.message);
  }
}

// ✅ Save toggle settings
function saveToggles() {
  fs.writeFileSync(toggleFile, JSON.stringify(toggles, null, 2));
}

// ✅ Auto-reset deleted messages file when bot starts
if (fs.existsSync(filePath)) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("⚠️ Error unlinking old delete.json:", err.message);
  }
}

const deletedMessages = new Map();
let botId = null; 

// ✅ Set Bot ID from connection
function setBotId(sock) {
  if (sock && sock.user && sock.user.id) {
    botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";
  }
}

// ✅ Store message (skip bot’s own)
function storeMessage(msg) {
  if (!msg || !msg.key || !msg.message) return;
  
  const jid = msg.key.remoteJid;
  const id = msg.key.id;

  if (!jid || !id) return;

  // ⛔ Skip if sender is the bot itself
  const sender = msg.key.participant || msg.key.remoteJid;
  if (msg.key.fromMe || sender === botId) return;

  if (!deletedMessages.has(jid)) {
    deletedMessages.set(jid, new Map());
  }

  deletedMessages.get(jid).set(id, msg);

  // ✅ Save current messages to file
  try {
    const storedData = {};
    for (const [jidKey, msgMap] of deletedMessages.entries()) {
      storedData[jidKey] = {};
      for (const [msgId, messageData] of msgMap.entries()) {
        storedData[jidKey][msgId] = {
          key: messageData.key,
          message: messageData.message,
          pushName: messageData.pushName
        };
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));
  } catch (err) {
    console.error("⚠️ Error writing delete.json:", err.message);
  }
}

// ✅ TOGGLE Command
async function toggleAntidelete({ conn, m, args, reply, jid }) {
  const option = (args[0] || "").toLowerCase();
  if (!["on", "off"].includes(option)) {
    return reply(
`〔 ✨ *ＡＮＴＩ－ＤＥＬＥＴＥ* ✨ 〕
┃ 🛡️ Usage:
┃    🌸 *.antidelete on*   → Enable
┃    🌸 *.antidelete off*  → Disable
┃ 
┃ 💡 This will save & recover
┃    any deleted messages 💬
╰━━━━━━━━━━━━━━━━━━╯`
    );
  }

  const enabled = option === "on";
  toggles[jid] = enabled;
  saveToggles();

  return reply(
`〔 💖 *ＡＮＴＩ－ＤＥＬＥＴＥ ＳＴＡＴＵＳ* 💖 〕
┃ 🔰 Protection: *${enabled ? "ＥＮＡＢＬＥＤ ✅" : "ＤＩＳＡＢＬＥＤ ❌"}*
┃ 📌 Applies to: *This Chat*
┃ 
┃ 👑 Secured by: ✨ Shabaan Bot ✨
╰━━━━━━━━━━━━━━━━━━╯`
  );
}

// ✅ Handle Message Revocation
async function handleMessageRevocation(sock, msg) {
  if (!msg || !msg.key) return;
  
  const jid = msg.key.remoteJid;
  const id = msg.message?.protocolMessage?.key?.id;

  if (!jid || !id || !deletedMessages.has(jid)) return;

  // ✅ Respect toggle setting (Defaults to true if not explicitly set to false)
  if (toggles[jid] === false) return;

  const storedMsg = deletedMessages.get(jid).get(id);
  if (!storedMsg) return;

  // ⛔ Skip if deleted message belonged to the bot
  const sender = storedMsg.key.participant || storedMsg.key.remoteJid;
  if (storedMsg.key.fromMe || sender === botId) {
    deletedMessages.get(jid).delete(id);
    return;
  }

  const senderName = storedMsg.pushName || sender.split("@")[0] || "Someone";
  const messageContent = extractMessageContent(storedMsg);

  const infoText = 
`〔 ⚠️ *ＡＮＴＩ－ＤＥＬＥＴＥ ＤＥＴＥＣＴＥＤ* ⚠️ 〕
┃ 👤 Sender: *${senderName}*
┃ 🗑️ Deleted msg recovered ✨
┃ 
┃ 💌 Secured by Shabaan Bot
╰━━━━━━━━━━━━━━━━━━╯`;

  try {
    if (messageContent.text) {
      await sock.sendMessage(jid, {
        text: `${infoText}\n\n🌸 *Message:* ${messageContent.text}`,
        mentions: [sender]
      }, { quoted: storedMsg });
    } else if (messageContent.media) {
      // Safely import download stream function dynamically
      const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
      const mediaStream = await downloadContentFromMessage(messageContent.media, messageContent.type);
      let physicalBuffer = Buffer.from([]);
      for await (const chunk of mediaStream) {
        physicalBuffer = Buffer.concat([physicalBuffer, chunk]);
      }

      await sock.sendMessage(jid, {
        caption: `${infoText}${messageContent.caption ? `\n\n📝 *Caption:* ${messageContent.caption}` : ""}`,
        [messageContent.type]: physicalBuffer,
        mentions: [sender]
      }, { quoted: storedMsg });
    }
  } catch (err) {
    console.error("❌ Failed to forward deleted message context:", err.message);
  }

  // Remove tracking memory entry after resolution
  deletedMessages.get(jid).delete(id);

  // ✅ Save again after removal
  try {
    const storedData = {};
    for (const [jidKey, msgMap] of deletedMessages.entries()) {
      storedData[jidKey] = {};
      for (const [msgId, messageData] of msgMap.entries()) {
        storedData[jidKey][msgId] = {
          key: messageData.key,
          message: messageData.message,
          pushName: messageData.pushName
        };
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));
  } catch (err) {
    console.error("⚠️ Error writing delete.json down loop:", err.message);
  }
}

// ✅ Extract message content helper
function extractMessageContent(msg) {
  const message = msg.message;

  if (!message) return { text: null };
  if (message.conversation) return { text: message.conversation };
  if (message.extendedTextMessage?.text) return { text: message.extendedTextMessage.text };
  
  if (message.imageMessage) return { type: "image", media: message.imageMessage, caption: message.imageMessage.caption };
  if (message.videoMessage) return { type: "video", media: message.videoMessage, caption: message.videoMessage.caption };
  if (message.stickerMessage) return { type: "sticker", media: message.stickerMessage };

  return { text: null };
}

module.exports = {
  storeMessage,
  handleMessageRevocation,
  toggleAntidelete,
  setBotId
};
                  
