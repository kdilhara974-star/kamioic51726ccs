const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// node-fetch (Node 18 safe)
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
      displayName: "© RANUMITHA-X-MD",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:RANUMITHA-X-MD
ORG:SONG DOWNLOADER;
TEL;type=CELL;waid=94762095304:+94762095304
END:VCARD`,
    },
  },
};

cmd(
  {
    pattern: "song",
    alias: ["play"],
    react: "🎵",
    desc: "Song downloader with thumbnail",
    category: "download",
    use: ".song <name>",
    filename: __filename,
  },

  async (conn, mek, m, { from, reply, q }) => {
    try {
      if (!q) return reply("🎶 *Song name ekak denna!*");

      // temp folder
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      // 🔗 YOUR API
      const apiUrl = `https://YOUR_API_URL_HERE?q=${encodeURIComponent(q)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.status || !data.result?.url)
        return reply("❌ Song not found!");

      const { url, filename } = data.result;

      // 🎯 extract video id from tunnel url
      let videoId = null;
      try {
        const u = new URL(url);
        videoId = u.searchParams.get("id");
      } catch {}

      const thumbnail = videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null;

      const title = filename
        .replace(".mp3", "")
        .replace(/[\\/:*?"<>|]/g, "");

      // caption
      const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${title}
🎧 *Format:* MP3
📡 *Source:* YouTube
🆔 *Video ID:* ${videoId || "N/A"}

🔽 *Reply with number:*

1️⃣ Audio 🎵  
2️⃣ Document 📁  
3️⃣ Voice Note 🎤  

> © Powered by RANUMITHA-X-MD 🌛`;

      const sent = await conn.sendMessage(
        from,
        thumbnail
          ? { image: { url: thumbnail }, caption }
          : { text: caption },
        { quoted: fakevCard }
      );

      const msgId = sent.key.id;

      const handler = async (msgUpdate) => {
        const mekInfo = msgUpdate.messages[0];
        if (!mekInfo?.message) return;

        const text =
          mekInfo.message.conversation ||
          mekInfo.message.extendedTextMessage?.text;

        const isReply =
          mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId === msgId;

        if (!isReply) return;

        conn.ev.off("messages.upsert", handler);

        await conn.sendMessage(from, {
          react: { text: "⬇️", key: mekInfo.key },
        });

        // AUDIO
        if (text === "1") {
          await conn.sendMessage(
            from,
            {
              audio: { url },
              mimetype: "audio/mpeg",
              fileName: `${title}.mp3`,
            },
            { quoted: mek }
          );
        }

        // DOCUMENT
        else if (text === "2") {
          await conn.sendMessage(
            from,
            {
              document: { url },
              mimetype: "audio/mpeg",
              fileName: `${title}.mp3`,
              caption: title,
            },
            { quoted: mek }
          );
        }

        // VOICE
        else if (text === "3") {
          const mp3 = path.join(tempDir, `${Date.now()}.mp3`);
          const opus = path.join(tempDir, `${Date.now()}.opus`);

          const buf = Buffer.from(
            await (await fetch(url)).arrayBuffer()
          );
          fs.writeFileSync(mp3, buf);

          await new Promise((res, rej) => {
            ffmpeg(mp3)
              .audioCodec("libopus")
              .format("opus")
              .audioBitrate("64k")
              .save(opus)
              .on("end", res)
              .on("error", rej);
          });

          await conn.sendMessage(
            from,
            {
              audio: fs.readFileSync(opus),
              mimetype: "audio/ogg; codecs=opus",
              ptt: true,
            },
            { quoted: mek }
          );

          fs.unlinkSync(mp3);
          fs.unlinkSync(opus);
        } else {
          return reply("❌ Invalid option!");
        }

        await conn.sendMessage(from, {
          react: { text: "✔️", key: mekInfo.key },
        });
      };

      conn.ev.on("messages.upsert", handler);
    } catch (e) {
      console.error(e);
      reply("⚠️ Error occurred.");
    }
  }
);
