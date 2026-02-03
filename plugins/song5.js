const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const yts = require("yt-search");

// node-fetch (safe for Node 18)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Fake vCard
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
    pattern: "song5",
    alias: ["play5"],
    react: "🎵",
    desc: "YouTube song downloader (Audio) via Ominisave API",
    category: "download",
    use: ".song <name or link>",
    filename: __filename,
  },

  async (conn, mek, m, { from, reply, q }) => {
    try {
      let query = q?.trim();

      if (!query && m?.quoted) {
        query =
          m.quoted.message?.conversation ||
          m.quoted.message?.extendedTextMessage?.text ||
          m.quoted.text;
      }

      if (!query) {
        return reply("⚠️ Please provide a song name or a YouTube link.");
      }

      if (query.includes("youtube.com/shorts/")) {
        const id = query.split("/shorts/")[1].split(/[?&]/)[0];
        query = `https://www.youtube.com/watch?v=${id}`;
      }

      const ownerJid = mek.key.participant || mek.key.remoteJid;

      let video, ytUrl;

      if (!query.includes("youtube.com") && !query.includes("youtu.be")) {
        const search = await yts(query);
        if (!search.videos.length) return reply("❌ Song not found!");
        video = search.videos[0];
        ytUrl = video.url;
      } else {
        ytUrl = query;
        const id = query.includes("v=")
          ? query.split("v=")[1].split("&")[0]
          : query.split("/").pop();
        video = await yts({ videoId: id });
      }

      const apiUrl = `https://ominisave.vercel.app/api/ytmp3?url=${encodeURIComponent(
        ytUrl
      )}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data.status || !data.result?.url)
        return reply("❌ Failed to download the song!");

      const { url, filename } = data.result;

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const title = video?.title || filename.replace(/\.mp3$/i, "");
      const thumbnail = video?.thumbnail;

      const caption = `
🎶 *RANUMITHA-X-MD SONG DOWNLOADER* 🎶

📑 *Title:* ${title}
📡 *Channel:* ${video?.author?.name || "Unknown"}
⏱ *Duration:* ${video?.timestamp || "N/A"}
🔗 *URL:* ${ytUrl}

🔽 *Reply with a number only (1 / 2 / 3):*

1 Audio Type 🎵
2 Document Type 📁
3 Voice Note Type 🎤

> © Powered by RANUMITHA-X-MD 🌛`;

      const sentMsg = await conn.sendMessage(
        from,
        thumbnail
          ? { image: { url: thumbnail }, caption }
          : { text: caption },
        { quoted: fakevCard }
      );

      const messageID = sentMsg.key.id;

      const handler = async (msgUpdate) => {
        try {
          const mekInfo = msgUpdate.messages[0];
          if (!mekInfo?.message) return;

          const senderJid =
            mekInfo.key.participant || mekInfo.key.remoteJid;
          if (senderJid !== ownerJid) return;

          const isReply =
            mekInfo.message?.extendedTextMessage?.contextInfo?.stanzaId ===
            messageID;
          if (!isReply) return;

          const rawText =
            mekInfo.message.conversation ||
            mekInfo.message.extendedTextMessage?.text ||
            "";

          const choice = rawText.trim().replace(/[^0-9]/g, "");

          // ⬇️ Download reaction
          await conn.sendMessage(from, {
            react: { text: "⬇️", key: mekInfo.key },
          });

          const safeTitle = title.replace(/[\\/:*?"<>|]/g, "").slice(0, 80);
          const audioFileName = `${safeTitle}.mp3`;
          const tempPath = path.join(tempDir, `${Date.now()}.mp3`);
          const voicePath = path.join(tempDir, `${Date.now()}.opus`);

          if (choice === "1") {
            await conn.sendMessage(
              from,
              {
                audio: { url },
                mimetype: "audio/mpeg",
                fileName: audioFileName,
              },
              { quoted: mekInfo }
            );

          } else if (choice === "2") {
            await conn.sendMessage(
              from,
              {
                document: { url },
                mimetype: "audio/mpeg",
                fileName: audioFileName,
                caption: title,
              },
              { quoted: mekInfo }
            );

          } else if (choice === "3") {
            const audioRes = await fetch(url);
            const buffer = Buffer.from(await audioRes.arrayBuffer());
            fs.writeFileSync(tempPath, buffer);

            await new Promise((resolve, reject) => {
              ffmpeg(tempPath)
                .audioCodec("libopus")
                .format("opus")
                .audioBitrate("64k")
                .save(voicePath)
                .on("end", resolve)
                .on("error", reject);
            });

            const voice = fs.readFileSync(voicePath);

            await conn.sendMessage(
              from,
              {
                audio: voice,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
              },
              { quoted: mekInfo }
            );

            fs.unlinkSync(tempPath);
            fs.unlinkSync(voicePath);

          } else {
            await reply("*❌ Invalid number!*");
            return;
          }

          // ⬆️ Upload reaction
          await conn.sendMessage(from, {
            react: { text: "⬆️", key: mekInfo.key },
          });

          // ✔️ Success reaction
          setTimeout(async () => {
            await conn.sendMessage(from, {
              react: { text: "✔️", key: mekInfo.key },
            });
          }, 800);

          conn.ev.off("messages.upsert", handler);

        } catch (e) {
          console.error(e);
          reply("⚠️ Error while processing the reply.");
        }
      };

      
    } catch (err) {
      console.error(err);
      reply("⚠️ An error occurred while processing the request.");
    }
  }
);
