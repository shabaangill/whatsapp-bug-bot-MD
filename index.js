const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

// Bot System Custom Identity Settings
const BOT_NAME = "Shabaan Bot";
const OWNER_NAME = "Shabaan";

async function startBot() {
    // Unique session directory name to isolate authentication states cleanly
    const { state, saveCreds } = await useMultiFileAuthState('./shabaan_session_vault');
    
    // CRUCIAL: Spoofing standard user browser metadata to completely bypass data-center blocks
    const sock = makeWASocket({ 
        auth: state,
        browser: ['Mac OS', 'Chrome', '125.0.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Prints the QR code precisely inside the cloud log terminals
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
                console.log('⚠️ Connection dropped by provider. Cooling down 5 seconds before safe reconnect...');
                setTimeout(() => {
                    startBot();
                }, 5000); 
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

        // Core Command Matrix
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
              
