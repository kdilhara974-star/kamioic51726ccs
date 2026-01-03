const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "getvideonote",
  alias: ["gvn"],
  desc: "Convert replied video to WhatsApp Video Note",
  category: "owner",
  react: "🎥",
  use: ".gvn <reply to video>",
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    // -------- CHECK REPLY -----------
    if (!m.quoted || m.quoted.mtype !== "videoMessage") {
      return reply("⚠️ *Please reply to a video!*");
    }

    // Reaction: Downloading
    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    const videoBuffer = await m.quoted.download();

    const tempInput = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    const tempOutput = path.join(__dirname, `../temp/${Date.now()}_ptv.mp4`);

    fs.writeFileSync(tempInput, videoBuffer);

    // Reaction: Converting
    await conn.sendMessage(from, { react: { text: "🔄", key: mek.key } });

    // -------- CONVERT TO VIDEO NOTE --------
    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .outputOptions([
          "-vf scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
          "-c:v libx264",
          "-profile:v baseline",
          "-level 3.0",
          "-pix_fmt yuv420p",
          "-r 30",
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
          "-t 60" // max 60s (WhatsApp limit)
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(tempOutput);
    });

    const finalVideo = fs.readFileSync(tempOutput);

    // -------- SEND VIDEO NOTE --------
    await conn.sendMessage(from, {
      video: finalVideo,
      mimetype: "video/mp4",
      ptt: true, // 👈 THIS makes it Video Note (round)
    });

    // Reaction: Done
    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    // Cleanup
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);

  } catch (e) {
    console.error(e);
    reply("*Error*");
  }
});
