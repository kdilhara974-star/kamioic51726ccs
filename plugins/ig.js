const axios = require("axios");
const { cmd } = require("../command");

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Hiruka",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`
        }
    }
};


cmd({
  pattern: "ig",
  alias: ["insta", "instagram"],
  react: "📽️",
  desc: "Download Instagram videos & audio",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q || !q.startsWith("http")) {
      return reply("*❌ Please provide a valid Instagram link*");
    }

    // ⏳ Processing react
    await conn.sendMessage(from, { react: { text: "📽️", key: m.key } });

    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`;
    const { data } = await axios.get(apiUrl);

    if (!data?.status || !data.data?.length) {
      return reply("*❌ Failed to fetch Instagram media*");
    }

    const media = data.data[0];

    const caption = `
    📽️ *RANUMITHA-X-MD INSTAGRAM DOWNLOADER* 📽️

📑 *File type:* ${media.type.toUpperCase()}
🔗 *Link:* ${q}

💬 *Reply with your choice:*

 1️⃣ Video Type 🎥
 2️⃣ Audio only 🎶

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

    const sentMsg = await conn.sendMessage(
      from,
      {
        image: { url: media.thumbnail },
        caption
      },
      { quoted: fakevCard }
    );

    const messageID = sentMsg.key.id;

    // 📩 Listen for reply
    conn.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (!msg?.message) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      const isReply =
        msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (!isReply) return;

      // ⬇️ Download react
      await conn.sendMessage(from, { react: { text: "⬇️", key: msg.key } });

      switch (text.trim()) {
        case "1":
          if (media.type !== "video") {
            return reply("*❌ No video found in this post*");
          }

          // ⬆️ Upload react
          await conn.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

          await conn.sendMessage(
            from,
            {
              video: { url: media.url },
              mimetype: "video/mp4"
            },
            { quoted: msg }
          );
          break;

        case "2":
          await conn.sendMessage(from, { react: { text: "⬆️", key: msg.key } });

          await conn.sendMessage(
            from,
            {
              audio: { url: media.url },
              mimetype: "audio/mp4",
              ptt: false
            },
            { quoted: msg }
          );
          break;

        default:
          return reply("*❌ Invalid option*");
      }

      // ✔️ Done react
      await conn.sendMessage(from, { react: { text: "✔️", key: msg.key } });
    });

  } catch (e) {
    console.log("Instagram Plugin Error:", e);
    reply("*Error*");
  }
});
