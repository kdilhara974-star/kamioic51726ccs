const { cmd } = require("../command");
const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Fake vCard
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

// Temp folder
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

cmd(
  {
    pattern: "song",
    alias: ["play", "song1", "play1"],
    react: "🎵",
    desc: "Download YouTube Song",
    category: "download",
    use: ".song <song name or YouTube link>",
    filename: __filename,
  },
  async (conn, mek, m, { from, reply, q }) => {
    try {
      // 🔹 Reply support
      if (!q) {
        const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted) {
          q = quoted.conversation || quoted.extendedTextMessage?.text;
        }
      }

      if (!q) return reply("⚠️ Song name or YouTube link ekak denna.");

      let video;

      // 🔹 Check if q is YouTube link
      const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      if (ytRegex.test(q)) {
        // Use yt-search to get video info
        const search = await yts(q);
        if (!search.videos.length) return reply("❌ Video not found.");
        video = search.videos[0];
      } else {
        // Search by name
        const search = await yts(q);
        if (!search.videos.length) return reply("❌ Song not found.");
        video = search.videos[0];
      }

      // Use video title as query to API
      const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(video.title)}`;
      const { data } = await axios.get(apiUrl);

      if (!data?.status || !data?.data?.url) return reply("❌ Song download karanna bari una.");

      const audioUrl = data.data.url;

      const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
📆 *Uploaded:* ${video.ago}
👁 *Views:* ${video.views}
🔗 *Url:* ${video.url}

🔽 *Reply with your choice:*

1️⃣ Audio 🎵
2️⃣ Document 📁
3️⃣ Voice Note 🎤

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠D`;

      const sentMsg = await conn.sendMessage(from, { image: { url: video.thumbnail }, caption }, { quoted: fakevCard });
      const messageID = sentMsg.key.id;

      const handler = async (msgUpdate) => {
        try {
          const mekInfo = msgUpdate.messages?.[0];
          if (!mekInfo?.message) return;

          const text = mekInfo.message.conversation || mekInfo.message.extendedTextMessage?.text;
          const isReply = mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId === messageID;
          if (!isReply) return;

          const choice = text.trim();
          const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
          const tempMp3 = path.join(tempDir, `${Date.now()}.mp3`);
          const tempOpus = path.join(tempDir, `${Date.now()}.opus`);

          // ⬇️ Download react
          await conn.sendMessage(from, { react: { text: "⬇️", key: mekInfo.key } });
          // ⬆️ Upload react
          await conn.sendMessage(from, { react: { text: "⬆️", key: mekInfo.key } });

          if (choice === "1") {
            await conn.sendMessage(from, { audio: { url: audioUrl }, mimetype: "audio/mpeg", fileName: `${safeTitle}.mp3` }, { quoted: mek });
          } else if (choice === "2") {
            await conn.sendMessage(from, { document: { url: audioUrl }, mimetype: "audio/mpeg", fileName: `${safeTitle}.mp3` }, { quoted: mek });
          } else if (choice === "3") {
            const res = await axios.get(audioUrl, { responseType: "arraybuffer" });
            fs.writeFileSync(tempMp3, res.data);
            await new Promise((resolve, reject) => {
              ffmpeg(tempMp3).audioCodec("libopus").format("opus").audioBitrate("64k").save(tempOpus).on("end", resolve).on("error", reject);
            });
            const voice = fs.readFileSync(tempOpus);
            await conn.sendMessage(from, { audio: voice, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: mek });
            fs.unlinkSync(tempMp3);
            fs.unlinkSync(tempOpus);
          } else {
            return reply("❌ Invalid choice!");
          }

          // ✔️ Done
          await conn.sendMessage(from, { react: { text: "✔️", key: mekInfo.key } });
          conn.ev.off("messages.upsert", handler);
        } catch (e) {
          console.error("song reply error:", e);
        }
      };

      conn.ev.on("messages.upsert", handler);
    } catch (err) {
      console.error("song cmd error:", err);
      reply("*❌ Error occurred*");
    }
  }
);
