const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const readline = require('readline');

const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

// ⚠️ REPLACE THIS WITH YOUR BOT'S PHONE NUMBER (Include country code, no spaces, no '+' sign)
// Example: "923XXXXXXXXX"
const PHONE_NUMBER = "923XXXXXXXXX"; 

async function startBot() {
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1015190524], isLatest: false }));
    console.log(`ℹ️ Synchronizing with WA Web v${version.join('.')}, Latest: ${isLatest}`);

    const { state, saveCreds } = await useMultiFileAuthState('./shabaan_session_vault');
    
    // Note: 'browser' must be set to 'Chrome (Ubuntu)' or similar native settings when requesting pairing codes
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
                    // Formats the code beautifully into a readable structure (e.g., XXXX-XXXX)
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log("\n========================================");
                    console.log(`👑 OWNER: ${OWNER_NAME.toUpperCase()} | 🤖 BOT: ${BOT_NAME.toUpperCase()}`);
                    console.log(`✨ YOUR WHATSAPP PAIRING CODE: ${code} ✨`);
                    console.log("========================================\n");
                } catch (error) {
                    console.log("❌ Failed to generate pairing code:", error);
                }
            }, 3000); // 3-second delay ensuring socket layer readiness
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
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (body === '.alive') {
            await sock.sendMessage(from, { 
                text: `✨ *${BOT_NAME} Status* ✨\n\n🟢 *Status:* Active and Operational\n👑 *Owner:* ${OWNER_NAME}` 
            });
        }
        
        if (body === '.menu' || body === '.help') {
            await sock.sendMessage(from, { 
                text: `🤖 *Welcome to ${BOT_NAME}* 🤖\n_Managed by ${OWNER_NAME}_\n\n*Available Commands:*\n\n• \`.alive\` - Check bot system status\n• \`.menu\` / \`.help\` - View command panel` 
            });
        }
    });
}

startBot();
