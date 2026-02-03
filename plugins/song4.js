const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// node-fetch safe import
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// fake quoted
const fakevCard = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast",
  },
  message: {
    contactMessage: {
      displayName: "© SONG BOT",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:SONG DOWNLOADER
TEL;type=CELL;waid=94762095304:+94762095304
END:VCARD`,
    },
  },
};

cmd(
  {
    pattern: "song4",
    alias: ["play4"],
    react: "🎵",
    desc: "Download YouTube song + menu",
    category: "download",
    use: ".song <song name or link>",
    filename: __filename,
  },

  async (conn, mek, m, { from, reply, q }) => {
    try {
      if (!q) return reply("⚠️ Please provide song name or YouTube link.");

      // API call
      const apiUrl = `https://ominisave.vercel.app/api/ytmp3?url=${encodeURIComponent(
        q
      )}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.status || !data.result?.url)
        return reply("❌ Song not found!");

      const { url, filename } = data.result;

      // create temp if not exist
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      // Thumbnail (YouTube video ID from link)
      let thumbUrl = null;
      try {
        const vid = new URL(q).searchParams.get("v");
        if (vid) thumbUrl = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
      } catch {}

      const safeTitle = filename.replace(/\.mp3$/i, "");

      const caption = `
🎶 *SONG DOWNLOADER BOT* 🎶

📑 *Title:* ${safeTitle}
📡 *Source:* YouTube
📥 *Format:* MP3

🔻 *Reply with:*

1️⃣ Audio 🎵  
2️⃣ Document 📁  
3️⃣ Voice Note 🎤`;

      const sent = await conn.sendMessage(
        from,
        thumbUrl
          ? { image: { url: thumbUrl }, caption }
          : { text: caption },
        { quoted: fakevCard }
      );

      const msgId = sent.key.id;

      // reply handler
      const handler = async (msgUpdate) => {
        const mekInfo = msgUpdate.messages[0];
        if (!mekInfo?.message) return;

        const text =
          mekInfo.message.conversation ||
          mekInfo.message.extendedTextMessage?.text;

        const isReply =
          mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId ===
          msgId;

        if (!isReply) return conn.ev.off("messages.upsert", handler);

        await conn.sendMessage(from, {
          react: { text: "⬇️", key: mekInfo.key },
        });

        // ⭕ 1: Audio
        if (text.trim() === "1") {
          await conn.sendMessage(
            from,
            {
              audio: { url },
              mimetype: "audio/mpeg",
              fileName: filename,
            },
            { quoted: mek }
          );
        }

        // ⭕ 2: Document
        else if (text.trim() === "2") {
          await conn.sendMessage(
            from,
            {
              document: { url },
              mimetype: "audio/mpeg",
              fileName: filename,
              caption: safeTitle,
            },
            { quoted: mek }
          );
        }

        // ⭕ 3: Voice note
        else if (text.trim() === "3") {
          const mp3Path = path.join(tempDir, `${Date.now()}.mp3`);
          const opusPath = path.join(tempDir, `${Date.now()}.opus`);

          const buff = Buffer.from(await (await fetch(url)).arrayBuffer());
          fs.writeFileSync(mp3Path, buff);

          await new Promise((res, rej) => {
            ffmpeg(mp3Path)
              .audioCodec("libopus")
              .format("opus")
              .audioBitrate("64k")
              .save(opusPath)
              .on("end", res)
              .on("error", rej);
          });

          await conn.sendMessage(
            from,
            {
              audio: fs.readFileSync(opusPath),
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            },
            { quoted: mek }
          );

          fs.unlinkSync(mp3Path);
          fs.unlinkSync(opusPath);
        }

        else {
          await reply("❌ Invalid option!");
        }

        await conn.sendMessage(from, {
          react: { text: "✔️", key: mekInfo.key },
        });

        conn.ev.off("messages.upsert", handler);
      };

      conn.ev.on("messages.upsert", handler);
    } catch (e) {
      console.error(e);
      reply("⚠️ Error occurred.");
    }
  }
);
