const axios = require("axios");
const { cmd } = require('../command');

cmd({
  pattern: "ig",
  alias: ["insta","instagram"],
  desc: "Instagram Downloader (Smooth)",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q || !q.startsWith("https://")) {
      return reply("❌ Valid Instagram link ekak denna");
    }

    await conn.sendMessage(from, {
      react: { text: "📽️", key: m.key }
    });

    const { data } = await axios.get(
      `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`
    );

    if (!data?.status || !data.data?.length) {
      return reply("⚠️ Media fetch karanna bari una");
    }

    const media = data.data[0];

    const sent = await conn.sendMessage(from, {
      image: { url: media.thumbnail },
      caption: `
📥 *Instagram Downloader*

1️⃣ HD Video
2️⃣ Audio (MP3)

Reply with number 👇
      `
    }, { quoted: m });

    const msgId = sent.key.id;

    const handler = async ({ messages }) => {
      const msg = messages[0];
      if (!msg?.message) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      const isReply =
        msg.message.extendedTextMessage?.contextInfo?.stanzaId === msgId;

      if (!isReply) return;

      // 🛑 Listener eka one-time
      conn.ev.off("messages.upsert", handler);

      // ⬇️ Downloading
      await conn.sendMessage(from, {
        react: { text: "⬇️", key: msg.key }
      });

      await new Promise(r => setTimeout(r, 800));

      // ⬆️ Uploading
      await conn.sendMessage(from, {
        react: { text: "⬆️", key: msg.key }
      });

      await new Promise(r => setTimeout(r, 800));

      if (text.trim() === "1" && media.type === "video") {
        await conn.sendMessage(from, {
          video: { url: media.url },
          caption: "✅ Video ready"
        }, { quoted: msg });
      } 
      else if (text.trim() === "2") {
        await conn.sendMessage(from, {
          audio: { url: media.url },
          mimetype: "audio/mp4"
        }, { quoted: msg });
      } 
      else {
        return reply("❌ Wrong option");
      }

      // ✔️ Done
      await conn.sendMessage(from, {
        react: { text: "✔️", key: msg.key }
      });
    };

    conn.ev.on("messages.upsert", handler);

  } catch (e) {
    console.error(e);
    reply("❌ Error");
  }
});
