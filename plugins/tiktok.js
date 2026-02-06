const axios = require("axios");
const { cmd } = require("../command");

// Fake vCard (optional – song2 vage)
const fakevCard = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    contactMessage: {
      displayName: "© Mr Hiruka",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=94762095304:+94762095304
END:VCARD`,
    },
  },
};

cmd(
  {
    pattern: "tiktok",
    alias: ["tt"],
    react: "🎬",
    desc: "Download TikTok videos",
    category: "download",
    use: ".tiktok <url>",
    filename: __filename,
  },

  async (conn, mek, m, { from, q, reply }) => {
    try {
      if (!q || !q.startsWith("http")) {
        return reply("❌ Please provide a valid TikTok URL.");
      }

      // React ⏳
      await conn.sendMessage(from, {
        react: { text: "⏳", key: mek.key },
      });

      // API
      const { data } = await axios.get(
        `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(
          q
        )}`
      );

      if (!data?.status || !data?.data) {
        return reply("⚠️ Failed to fetch TikTok data.");
      }

      const dat = data.data;

      const caption = `
📺 *TIKTOK DOWNLOADER* 📥

📑 *Title:* ${dat.title || "No title"}
⏱ *Duration:* ${dat.duration || "N/A"}
👀 *Views:* ${dat.view || "0"}
💬 *Comments:* ${dat.comment || "0"}
🔁 *Shares:* ${dat.share || "0"}

🔽 *Reply with number:*

1. *HD Video* 🔋
2. *SD Video* 📱
3. *Audio (MP3)* 🎵

> © Powered by RANUMITHA-X-MD 🌛`;

      const sentMsg = await conn.sendMessage(
        from,
        {
          image: { url: dat.thumbnail },
          caption,
        },
        { quoted: fakevCard }
      );

      const messageID = sentMsg.key.id;

      // 🔁 Reply listener
      const handler = async (msgUpdate) => {
        try {
          const mekInfo = msgUpdate.messages[0];
          if (!mekInfo?.message) return;

          const text =
            mekInfo.message.conversation ||
            mekInfo.message.extendedTextMessage?.text;

          const isReply =
            mekInfo.message.extendedTextMessage?.contextInfo?.stanzaId ===
            messageID;

          if (!isReply) return;

          // React ⬇️
          await conn.sendMessage(from, {
            react: { text: "⬇️", key: mekInfo.key },
          });

          const choice = text.trim();

          let sendType;

          if (choice === "1") {
            // HD
            sendType = {
              video: { url: dat.video },
              caption: "📥 *Downloaded HD Quality*",
            };
          } else if (choice === "2") {
            // SD (fallback → HD)
            sendType = {
              video: { url: dat.sd_video || dat.video },
              caption: "📥 *Downloaded SD Quality*",
            };
          } else if (choice === "3") {
            // Audio
            sendType = {
              audio: { url: dat.audio },
              mimetype: "audio/mpeg",
              ptt: false,
            };
          } else {
            return reply("❌ Invalid option! Reply only 1, 2 or 3.");
          }

          // React ⬆️
          await conn.sendMessage(from, {
            react: { text: "⬆️", key: mekInfo.key },
          });

          await conn.sendMessage(from, sendType, { quoted: mekInfo });

          // React ✔️
          await conn.sendMessage(from, {
            react: { text: "✔️", key: mekInfo.key },
          });

          // 🧹 listener remove (VERY IMPORTANT)
          conn.ev.off("messages.upsert", handler);
        } catch (e) {
          console.error("TT reply error:", e);
        }
      };

      conn.ev.on("messages.upsert", handler);
    } catch (err) {
      console.error("TikTok plugin error:", err);
      reply("❌ Error while processing TikTok download.");
    }
  }
);
