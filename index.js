const fs = require("fs");
const readline = require("readline");
const P = require("pino");
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} = require("@whiskeysockets/baileys");
const { Boom } = require('@hapi/boom');

// Structural feature handlers
const { handleCommand } = require("./menu/case");
const { loadSettings } = require("./settings");
const { storeMessage, handleMessageRevocation } = require("./antidelete");

const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

// ✅ Your exact phone number configured for pairing authentication
const PHONE_NUMBER = "923143007893"; 

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015190524] }));

  const sock = makeWASocket({ 
    version, 
    auth: state, 
    logger: P({ level: "fatal" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    printQRInTerminal: false 
  });

  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  
  // Expose configuration globally for modular file access
  global.sock = sock;
  global.settings = settings;
  global.signature = settings.signature || "> 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 𝗕𝗢𝗧 ❦ ✓";
  global.owner = `${PHONE_NUMBER}@s.whatsapp.net`;
  global.ownerNumber = PHONE_NUMBER;

  // ✅ System Feature Flags Configuration
  global.antibug = false;
  global.autogreet = {};
  global.autotyping = false;
  global.autoreact = false;
  global.autostatus = false;

  console.log("✅ BOT OWNER:", global.owner);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {  
      console.log(`🚀 Success! ${BOT_NAME} is officially Online & Operational! 🚀`);  
    }  

    if (connection === "close") {  
      const shouldReconnect = (lastDisconnect?.error instanceof Boom) ? 
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
      
      console.log("❌ Disconnected. Reconnecting:", shouldReconnect);  
      if (shouldReconnect) {
        console.log('⚠️ Reconnecting in 3 seconds for optimal uptime throughput...');
        setTimeout(() => { startBot(); }, 3000);
      }  
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message) return;

    const jid = msg.key.remoteJid;
    
    // Process input context cleanly across groups and private profiles
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const cleanInput = text.trim();
    const command = cleanInput.toLowerCase();

    // ✅ AntiDelete Pipeline Processing
    if (settings.ANTIDELETE === true) {  
      try {  
        if (msg.message) storeMessage(msg);  
        if (msg.message?.protocolMessage?.type === 0) {  
          await handleMessageRevocation(sock, msg);  
          return;  
        }  
      } catch (err) {  
        console.error("❌ AntiDelete Error:", err.message);  
      }  
    }  

    // ✅ AutoTyping Engine Execution
    if (global.autotyping && jid !== "status@broadcast") {  
      try {  
        await sock.sendPresenceUpdate('composing', jid);  
      } catch (err) {  
        console.error("❌ AutoTyping Error:", err.message);  
      }  
    }  

    // ✅ AutoReact Engine Execution
    if (global.autoreact && jid !== "status@broadcast") {
      try {
        const hearts = ["❤️","☣️","⚡","🧡","💛","💚","💙","💜","🖤","🤍","🇵防","✨","👋"];
        const randomHeart = hearts[Math.floor(Math.random() * hearts.length)];
        await sock.sendMessage(jid, { react: { text: randomHeart, key: msg.key } }).catch(() => {});
      } catch (err) {
        console.error("❌ AutoReact Error:", err.message);
      }
    }  

    // ✅ AutoStatus View Tracking Interception
    if (global.autostatus && jid === "status@broadcast") {  
      try {  
        await sock.readMessages([{  
          remoteJid: jid,  
          id: msg.key.id,  
          participant: msg.key.participant || msg.participant  
        }]);  
        console.log(`👁️ Status Seen: ${msg.key.participant || "Unknown"}`);  
      } catch (err) {  
        console.error("❌ AutoStatus View Error:", err.message);  
      }  
      return;  
    }  

    // ✅ Native Base Commands System (Fast Route)
    if (command === '.alive') {
        return await sock.sendMessage(jid, { 
            text: `✨ *${BOT_NAME} Status* ✨\n\n🟢 *Status:* Active and Operational\n👑 *Owner:* ${OWNER_NAME}\n⚡ *Signature:* ${global.signature}` 
        }, { quoted: msg });
    }

    if (command === '.menu' || command === '.help') {
        const menuText = `🤖 *WELCOME TO ${BOT_NAME.toUpperCase()}* 🤖\n` +
                         `_Maintained smoothly by ${OWNER_NAME}_\n\n` +
                         `⚙️ *SYSTEM MODERATION FLAGS* ⚙️\n\n` +
                         `• \`.alive\` — Run response connectivity diagnostic\n` +
                         `• \`.menu\` — Open responsive helper dashboard\n` +
                         `• *Anti-Delete Mode:* ${settings.ANTIDELETE === true ? "🟢 Active" : "🔴 Inactive"}\n` +
                         `• *Auto-Reaction Engine:* ${global.autoreact ? "🟢 Active" : "🔴 Inactive"}\n\n` +
                         `_${global.signature}_`;

        return await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
    }

    // ✅ Extended Case Routing Matrix Handler
    try {  
      await handleCommand(sock, msg, {});  
    } catch (err) {  
      console.error("❌ Command error:", err.message || err);  
    }
  });

  // ✅ AutoGreet Welcomer Pipeline
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;
    if (!global.autogreet?.[id]) return;

    try {
      const metadata = await sock.groupMetadata(id);
      const memberCount = metadata.participants.length;
      const groupName = metadata.subject || "Unnamed Group";

      for (const user of participants) {
        const tag = `@${user.split("@")[0]}`;
        let message = "";

        if (action === "add") {
          message = `✨ *Welcome ${tag} to ${groupName}!* ✨\n\n🛡️ You are member number *${memberCount}*.\n🤖 *${BOT_NAME}* is running protection protocols here.`;
        } else if (action === "remove") {
          message = `👋 *Goodbye ${tag}* from ${groupName}.\n⚡ *Remaining Members:* ${memberCount - 1}`;
        }

        if (message) {
          await sock.sendMessage(id, { text: message, mentions: [user] });
        }
      }
    } catch (err) {
      console.error("❌ AutoGreet Error:", err.message);
    }
  });

  // ✅ Automated Cloud Token Verification Engine
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(PHONE_NUMBER);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log("\n========================================");
        console.log(`👑 OWNER: ${OWNER_NAME.toUpperCase()} | 🤖 BOT: ${BOT_NAME.toUpperCase()}`);
        console.log(`✨ YOUR WHATSAPP PAIRING CODE: ${code} ✨`);
        console.log("========================================\n");
      } catch (error) {
        console.log("❌ Failed to generate pairing code:", error);
      }
    }, 3000);
  }
}

startBot();
        
