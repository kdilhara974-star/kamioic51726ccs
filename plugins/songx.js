const { cmd } = require("../command");
const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "song4",
  react: "🎵",
  desc: "YouTube Song Downloader",
  category: "download",
  use: ".song4 <query>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    /* ===== QUERY ===== */
    let query = q?.trim();
    if (!query && m?.quoted) {
      query =
        m.quoted.message?.conversation ||
        m.quoted.message?.extendedTextMessage?.text;
    }
    if (!query) return reply("⚠️ Song name or YouTube link ekak denna");

    if (query.includes("youtube.com/shorts/")) {
      const id = query.split("/shorts/")[1].split(/[?&]/)[0];
      query = `https://www.youtube.com/watch?v=${id}`;
    }

    /* ===== SEARCH ===== */
    const search = await yts(query);
    if (!search.videos.length)
      return reply("❌ Song eka hambune naha");

    const video = search.videos[0];

    /* ===== API ===== */
    const api = `https://api-aswin-sparky.koyeb.app/api/downloader/song?search=${encodeURIComponent(
      video.url
    )}`;
    const { data } = await axios.get(api);
    if (!data?.status || !data?.data?.url)
      return reply("❌ Download error");

    const songUrl = data.data.url;

    /* ===== MENU ===== */
    const sent = await conn.sendMessage(
      from,
      {
        image: { url: video.thumbnail },
        caption: `
🎵 *Song Downloader*

📌 *${video.title}*
⏱️ ${video.timestamp}

Reply with number 👇

1️⃣ Audio  
2️⃣ MP3 Document  
3️⃣ Voice Note
`,
      },
      { quoted: m }
    );

    const menuId = sent.key.id;

    /* ===== REACT HELPER ===== */
    const react = async (emoji, key) => {
      await conn.sendMessage(from, {
        react: { text: emoji, key },
      });
    };

    /* ===== ONE TIME LISTENER ===== */
    const handler = async (up) => {
      const msg = up.messages?.[0];
      if (!msg?.message) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text;

      const stanzaId =
        msg.message.extendedTextMessage?.contextInfo?.stanzaId;

      if (stanzaId !== menuId) return;

      // remove listener after first valid reply
      conn.ev.off("messages.upsert", handler);

      /* ⬇️ DOWNLOAD START */
      await react("⬇️", msg.key);

      /* ===== OPTION 1 : AUDIO ===== */
      if (text === "1") {
        /* ⬆️ UPLOAD START */
        await react("⬆️", msg.key);

        await conn.sendMessage(
          from,
          {
            audio: { url: songUrl },
            mimetype: "audio/mpeg",
          },
          { quoted: msg }
        );

        await react("✔️", msg.key);
      }

      /* ===== OPTION 2 : DOCUMENT ===== */
      else if (text === "2") {
        const buffer = await axios.get(songUrl, {
          responseType: "arraybuffer",
        });

        /* ⬆️ UPLOAD START */
        await react("⬆️", msg.key);

        await conn.sendMessage(
          from,
          {
            document: buffer.data,
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`,
          },
          { quoted: msg }
        );

        await react("✔️", msg.key);
      }

      /* ===== OPTION 3 : VOICE NOTE ===== */
      else if (text === "3") {
        const opus = path.join(__dirname, `${Date.now()}.opus`);

        await new Promise((resolve, reject) => {
          ffmpeg(songUrl)
            .audioCodec("libopus")
            .format("opus")
            .save(opus)
            .on("end", resolve)
            .on("error", reject);
        });

        /* ⬆️ UPLOAD START */
        await react("⬆️", msg.key);

        await conn.sendMessage(
          from,
          {
            audio: fs.readFileSync(opus),
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
          },
          { quoted: msg }
        );

        fs.unlinkSync(opus);
        await react("✔️", msg.key);
      }

      /* ===== INVALID ===== */
      else {
        reply("❌ 1, 2, or 3 kiyala reply karanna");
      }
    };

    conn.ev.on("messages.upsert", handler);
  } catch (e) {
    console.error(e);
    reply("❌ Error occurred");
  }
});
