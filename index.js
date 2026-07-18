const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

async function startBot() {
    // 1. Fetch dynamic WhatsApp web version to bypass 405 WebSocket blocks
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => ({ version: [2, 3000, 1015190524], isLatest: false }));
    console.log(`ℹ️ Synchronizing with WA Web v${version.join('.')}, Latest: ${isLatest}`);

    // Clean execution session tracking
    const { state, saveCreds } = await useMultiFileAuthState('./shabaan_session_vault');
    
    const sock = makeWASocket({ 
        version, // Forces socket to use the fetched official web client version
        auth: state,
        browser: ['Mac OS', 'Chrome', '125.0.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("\n========================================");
            console.log(`🤖 SCAN TO CONNECT ${BOT_NAME.toUpperCase()} 🤖`);
            console.log("========================================");
            qrcode.generate(qr, { small: true });
            console.log("========================================\n");
        }

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
