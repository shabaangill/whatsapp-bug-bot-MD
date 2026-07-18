// ✅ Shabaan Bot Stylish Configuration

const config = {
  // 👑 Owner Info
  ownerNumber: ['923143007893'],              // 🔹 Your clean international phone format
  ownerName: '𓆩 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 ❦︎𓆪',                // 🔹 Displayed in Greetings
  botName: '🤖 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 𝗕𝗢𝗧 ⚡',                // 🔹 Bot Display Name
  signature: '> 𝗦𝗛𝗔𝗕𝗔𝗔𝗡 𝗕𝗢𝗧 ❦ ✓',              // 🔹 Footer on Bot Replies
  youtube: 'https://www.youtube.com', 

  // ⚙️ Feature Toggles
  autoTyping: false,        // ⌨️ Fake Typing
  autoReact: false,         // 💖 Auto Emoji Reaction
  autoStatusView: false,    // 👁️ Auto-View Status
  public: true,             // 🌍 Public or Private Mode
  antiLink: false,          // 🚫 Delete Links in Groups
  antiBug: false,           // 🛡️ Prevent Malicious Crashes
  greetings: true,          // 🙋 Welcome/Farewell Messages
  readmore: false,          // 📜 Readmore in Long Replies
  ANTIDELETE: true          // 🗑️ Anti-Delete Messages
};

// ✅ Register owner(s) globally in WhatsApp JID format
global.owner = (
  Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber]
).map(num => num.replace(/\D/g, '') + '@s.whatsapp.net');

// ⚙️ Export Settings Loader
function loadSettings() {
  return config;
}

module.exports = { loadSettings };

