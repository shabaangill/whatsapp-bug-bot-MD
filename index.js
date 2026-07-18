const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');

const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

// ✅ Your phone number configured for pairing authentication
const PHONE_NUMBER = "923143007893"; 

async function startBot() {
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1015190524], isLatest: false }));
    console.log(`ℹ️ Synchronizing with WA Web v${version.join('.')}, Latest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState('./shabaan_session_vault');
    
    const sock = makeWASocket({ 
        version,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Triggers the Pairing Code generation if the session isn't logged in yet
    if (!sock.authState.creds.registered) {
        if (!PHONE_NUMBER || PHONE_NUMBER === "923XXXXXXXXX") {
            console.log("❌ ERROR: Please edit index.js and provide your real phone number in the PHONE_NUMBER variable!");
        } else {
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

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            if (shouldReconnect) {
                console.log('⚠️ Reconnecting in 5 seconds to bypass network traffic throttling...');
                setTimeout(() => { startBot(); }, 5000); 
            }
        } else if (connection === 'open') {
            console.log(`🚀 Success! ${BOT_NAME} is officially Online & Operational! 🚀`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        
        // Advanced text extractor to capture all chat/media variations flawlessly
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || 
                     msg.message.imageMessage?.caption || 
                     msg.message.videoMessage?.caption || 
                     "";

        // Standardize raw incoming strings for clean execution matching
        const cleanInput = body.trim();
        const command = cleanInput.toLowerCase();

        // ==========================================
        // ⚡ FEATURE: AUTO-REACT ENGINE
        // ==========================================
        // Automatically adds a reaction to certain keywords or prefixes
        if (cleanInput.startsWith('.')) {
            await sock.sendMessage(from, {
                react: { text: "⚡", key: msg.key }
            });
        } else if (command.includes('hello') || command.includes('hi')) {
            await sock.sendMessage(from, {
                react: { text: "👋", key: msg.key }
            });
        }

        // ==========================================
        // 🛠️ COMMAND MATRIX
        // ==========================================

        // 1. .alive Command
        if (command === '.alive') {
            await sock.sendMessage(from, { 
                text: `✨ *${BOT_NAME} Status* ✨\n\n🟢 *Status:* Active and Operational\n👑 *Owner:* ${OWNER_NAME}` 
            });
        }

        // 2. .status / .view Command (Detailed Server Analytics)
        if (command === '.status' || command === '.view') {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            const statusText = `📊 *${BOT_NAME.toUpperCase()} METRICS* 📊\n\n` +
                               `🟢 *System Engine:* Live\n` +
                               `⏰ *Server Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
                               `📡 *Platform Environment:* Railway Cloud\n` +
                               `⚡ *Auto-Reaction Mode:* Enabled (Active)\n` +
                               `👥 *Target Socket:* Multi-Device Node Node`;

            await sock.sendMessage(from, { text: statusText });
        }
        
        // 3. .owner Command
        if (command === '.owner') {
            await sock.sendMessage(from, {
                text: `👑 *Official Developer Info* 👑\n\nThis application matrix is built, managed, and driven by *${OWNER_NAME}*.`
            });
        }
        
        // 4. .menu / .help Central Command Hub
        if (command === '.menu' || command === '.help') {
            const menuText = `🤖 *WELCOME TO ${BOT_NAME.toUpperCase()}* 🤖\n` +
                             `_Maintained smoothly by ${OWNER_NAME}_\n\n` +
                             `⚙️ *SYSTEM COMMANDS* ⚙️\n\n` +
                             `• \`.menu\` / \`.help\` — Show this responsive user helper dashboard\n` +
                             `• \`.alive\` — Run quick response connectivity diagnostic\n` +
                             `• \`.status\` / \`.view\` — Pull server performance and runtime analytics\n` +
                             `• \`.owner\` — Access administrative contact identity profiles\n\n` +
                             `✨ *INTELLIGENT AUTO FEATURES* ✨\n\n` +
                             `• *Auto React Engine:* Automatically drops a ⚡ emoji to commands and a 👋 emoji to greeting texts.\n\n` +
                             `💡 _Tip: Make sure to type the command correctly from an alternate phone to see the bot respond._`;

            await sock.sendMessage(from, { text: menuText });
        }
    });
}

startBot();
               
