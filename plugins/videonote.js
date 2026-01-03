const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "getvideonote",
  alias: ["gvn"],
  desc: "Convert replied video or URL to WhatsApp Video Note",
  category: "owner",
  react: "🎬",
  use: ".gvn <reply/video/url>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let videoBuffer;

    // -------- IF USER REPLIED TO VIDEO -----------
    if (m.quoted) {
      let type = m.quoted.mtype;
      if (type === "videoMessage") {
        videoBuffer = await m.quoted.download();
      } else {
        return reply("⚠️ *Please reply to a video!*");
      }
    }
    // -------- IF PROVIDED VIDEO URL -----------------------
    else if (q) {
      const videoUrl = q.trim();
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("Invalid video URL");
      videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    } else {
      return reply("⚠️ *Reply to a video or provide a URL!*");
    }

    // Reaction: Downloading
    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    // TEMP PATHS
    const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    const notePath = path.join(__dirname, `../temp/${Date.now()}_note.mp4`);
    fs.writeFileSync(tempPath, videoBuffer);

    // Reaction: Converting
    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    // -------- CONVERT TO WHATSAPP VIDEO NOTE ----------------
    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .outputOptions([
          "-t 16", // max 16 seconds
          "-vf scale=480:480:force_original_aspect_ratio=decrease,pad=480:480:(ow-iw)/2:(oh-ih)/2", // square
          "-c:v libx264",
          "-preset ultrafast",
          "-c:a aac",
          "-b:a 64k",
          "-pix_fmt yuv420p"
        ])
        .format("mp4")
        .on("end", resolve)
        .on("error", reject)
        .save(notePath);
    });

    const noteBuffer = fs.readFileSync(notePath);

    // SEND WHATSAPP VIDEO NOTE
    await conn.sendMessage(from, {
      video: noteBuffer,
      mimetype: "video/mp4",
      ptv: true, // circular video note
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // CLEANUP
    fs.unlinkSync(tempPath);
    fs.unlinkSync(notePath);

  } catch (err) {
    console.error(err);
    await conn.sendMessage(from, { react: { text: "🎬", key: mek.key } });
    reply("*Error sending video note*");
  }
});
