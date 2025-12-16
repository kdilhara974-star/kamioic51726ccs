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

cmd({
  pattern: "song3",
  alias: ["play3"],
  react: "🎵",
  desc: "YouTube Song Downloader (Audio/Document/Voice Note)",
  category: "download",
  use: ".song3 <query>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let query = q?.trim();

    if (!query && m?.quoted) {
      query =
        m.quoted.message?.conversation ||
        m.quoted.message?.extendedTextMessage?.text ||
        m.quoted.text;
    }

    if (!query) return reply("⚠️ Please provide a song name or YouTube link.");

    if (query.includes("youtube.com/shorts/")) {
      const id = query.split("/shorts/")[1].split(/[?&]/)[0];
      query = `https://www.youtube.com/watch?v=${id}`;
    }

    // Search YouTube
    const search = await yts(query);
    if (!search.videos.length) return reply("❌ Song not found.");

    const video = search.videos[0];

    // Use API to fetch audio link
    const api = `https://gtech-api-xtp1.onrender.com/api/audio/yt?apikey=APIKEY&url=${encodeURIComponent(video.url)}`;
    const { data: apiRes } = await axios.get(api);

    if (!apiRes?.status || !apiRes.result?.media?.audio_url) {
      return reply("❌ Unable to download the song. Please try another one!");
    }

    const result = apiRes.result.media;

    // Send menu
    const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${video.title}
⏱ *Duration:* ${video.timestamp}
📆 *Uploaded:* ${video.ago}
👁 *Views:* ${video.views}
🔗 *Url:* ${video.url}

🔽 *Reply with your choice:*

1️⃣ *Audio Type* 🎵  
2️⃣ *Document Type* 📁  
3️⃣ *Voice Note Type* 🎤  

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝐃 🌛`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: video.thumbnail },
      caption,
    }, { quoted: fakevCard });

    const messageID = sentMsg.key.id;

    // React helper
    const react = async (emoji, key) => {
      await conn.sendMessage(from, { react: { text: emoji, key } });
    };

    // Listener for replies to menu
    const handler = async (up) => {
      const msg = up.messages?.[0];
      if (!msg?.message) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      const stanzaId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

      if (stanzaId !== messageID) return;
      if (!["1", "2", "3"].includes(text)) return;

      await react("⬇️", msg.key);

      if (text === "1") { // Audio
        await react("⬆️", msg.key);
        await conn.sendMessage(from, {
          audio: { url: result.audio_url },
          mimetype: "audio/mpeg",
          ptt: false,
        }, { quoted: msg });
        return react("✔️", msg.key);
      }

      if (text === "2") { // Document
        const buffer = await axios.get(result.audio_url, { responseType: "arraybuffer" });
        await react("⬆️", msg.key);
        await conn.sendMessage(from, {
          document: buffer.data,
          mimetype: "audio/mpeg",
          fileName: `${video.title}.mp3`,
        }, { quoted: msg });
        return react("✔️", msg.key);
      }

      if (text === "3") { // Voice Note
        const mp3Path = path.join(__dirname, `${Date.now()}.mp3`);
        const opusPath = path.join(__dirname, `${Date.now()}.opus`);

        const stream = await axios.get(result.audio_url, { responseType: "stream" });
        const writer = fs.createWriteStream(mp3Path);
        stream.data.pipe(writer);
        await new Promise(r => writer.on("finish", r));

        await new Promise((resolve, reject) => {
          ffmpeg(mp3Path)
            .audioCodec("libopus")
            .format("opus")
            .save(opusPath)
            .on("end", resolve)
            .on("error", reject);
        });

        await react("⬆️", msg.key);

        await conn.sendMessage(from, {
          audio: fs.readFileSync(opusPath),
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,
        }, { quoted: msg });

        fs.unlinkSync(mp3Path);
        fs.unlinkSync(opusPath);

        return react("✔️", msg.key);
      }
    };

    conn.ev.on("messages.upsert", handler);

  } catch (e) {
    console.error("Song3 Command Error:", e);
    reply("❌ An error occurred while processing your request.");
  }
});
