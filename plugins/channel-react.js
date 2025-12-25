const { cmd } = require("../command");

cmd({
  pattern: "creact",
  react: "📢",
  desc: "React multiple emojis to channel message (reply only)",
  category: "channel",
  use: "Reply channel msg + .creact 💚,❤️",
  filename: __filename
}, async (conn, mek, m, { q, reply }) => {
  try {
    if (!m.quoted)
      return reply("❌ Channel message ekakata reply karala command eka yawanna");

    if (!q)
      return reply("❌ Emoji denna\nExample: .creact 💚,❤️");

    const emojis = q.split(",").map(e => e.trim()).filter(Boolean);
    if (!emojis.length) return reply("❌ Emoji list empty");

    for (const emoji of emojis) {
      await conn.sendMessage(m.quoted.key.remoteJid, {
        react: {
          text: emoji,
          key: m.quoted.key
        }
      });
      await new Promise(r => setTimeout(r, 500));
    }

    reply(`✅ Reacted: ${emojis.join(" ")}`);

  } catch (e) {
    console.error(e);
    reply("❌ React failed");
  }
});
