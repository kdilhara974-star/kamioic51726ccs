const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const fetch = require("node-fetch");

// Fake vCard
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

// Convert "3:17" → seconds
function toSeconds(time) {
  if (!time) return 0;
  const p = time.split(":").map(Number);
  return p.length === 2 ? p[0]*60 + p[1] : parseInt(time);
}

// Ensure temp folder exists
const tempDir = path.join(__dirname, "../temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

cmd({
  pattern: "csong",
  alias: ["chsong", "channelplay"],
  react: "🍁",
  desc: "Send a song to a WhatsApp Channel (YouTube link or song name)",
  category: "channel",
  use: ".csong <song name or YouTube link> & <channel JID>",
  filename: __filename,
}, async (conn, mek, m, { reply, q }) => {
  try {
    if (!q || !q.includes("&")) return reply(
      "⚠️ Format:\n.csong <song name or YouTube link> & <channel JID>\nExample:\n.csong Shape of You & 1203630xxxxx@newsletter"
    );

    // Split by & for channel JID
    const [input, channelJidRaw] = q.split("&").map(x => x.trim());
    const channelJid = channelJidRaw;

    if (!channelJid.endsWith("@newsletter")) return reply("❌ Invalid channel JID! Must end with @newsletter");
    if (!input) return reply("⚠️ Please provide a song name or YouTube link.");

    let meta, dlUrl;

    if (input.includes("youtu")) {
      // YouTube link
      const info = await ytdl.getInfo(input);
      meta = {
        title: info.videoDetails.title,
        duration: info.videoDetails.lengthSeconds,
        channel: info.videoDetails.author.name,
        cover: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url
      };
      dlUrl = ytdl(input, { filter: "audioonly", quality: "highestaudio" });
    } else {
      // Song name → search via Nekolabs API
      const apiUrl = `https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${encodeURIComponent(input)}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!data?.success || !data?.result?.downloadUrl) return reply("❌ Song not found.");
      meta = data.result.metadata;
      dlUrl = data.result.downloadUrl;
    }

    // Download audio to temp
    const tempPath = path.join(tempDir, `song_${Date.now()}.mp3`);
    if (typeof dlUrl === "string") {
      const audioRes = await fetch(dlUrl);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      fs.writeFileSync(tempPath, audioBuffer);
    } else {
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tempPath);
        dlUrl.pipe(writeStream);
        dlUrl.on("end", resolve);
        dlUrl.on("error", reject);
      });
    }

    // Fetch thumbnail
    let buffer = null;
    try {
      if (meta.cover) {
        const thumbRes = await fetch(meta.cover);
        buffer = Buffer.from(await thumbRes.arrayBuffer());
      }
    } catch {}

    const caption = `🎶 *RANUMITHA-X-MD SONG SENDER* 🎶
*🎧 Title*: ${meta.title}
*🫟 Channel*: ${meta.channel}
*🕐 Time*: ${toSeconds(meta.duration)} seconds
© Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

    // Send thumbnail + caption
    await conn.sendMessage(channelJid, { image: buffer, caption }, { quoted: fakevCard });

    // Send audio
    const audioBuffer = fs.readFileSync(tempPath);
    await conn.sendMessage(channelJid, { audio: audioBuffer, mimetype: "audio/mpeg", ptt: false }, { quoted: fakevCard });

    fs.unlinkSync(tempPath);

    reply(`✅ Song sent successfully\n🎧 ${meta.title}\n🔖 Channel: ${channelJid}`);

  } catch (err) {
    console.error(err);
    reply("⚠️ Error while sending song.");
  }
});
