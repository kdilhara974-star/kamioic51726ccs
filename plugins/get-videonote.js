const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
  pattern: "getvnote",
  alias: ["gvn"],
  desc: "Convert replied video or URL to WhatsApp Video Note",
  category: "owner",
  react: "🎥",
  use: ".gvn <reply video | video url>",
  filename: __filename,
}, async (conn, mek, m, { from, reply, q }) => {
  try {
    let mediaBuffer;

    // -------- REPLIED VIDEO ----------
    if (m.quoted) {
      if (m.quoted.mtype !== "videoMessage") {
        return reply("⚠️ *Video ekakata reply karanna!*");
      }
      mediaBuffer = await m.quoted.download();
    }

    // -------- VIDEO URL ----------
    else if (q) {
      const res = await fetch(q);
      if (!res.ok) throw new Error("Invalid video URL");
      mediaBuffer = Buffer.from(await res.arrayBuffer());
    } 
    else {
      return reply("⚠️ *Video ekakata reply karanna naththang URL ekak denna!*");
    }

    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    const inputPath = path.join(__dirname, `../temp/${Date.now()}.mp4`);
    const outputPath = path.join(__dirname, `../temp/${Date.now()}_ptv.mp4`);

    fs.writeFileSync(inputPath, mediaBuffer);

    await conn.sendMessage(from, { react: { text: "⚙️", key: mek.key } });

    // -------- CONVERT TO VIDEO NOTE FORMAT --------
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-vf crop='min(iw,ih):min(iw,ih)'", // square
          "-c:v libx264",
          "-preset veryfast",
          "-movflags +faststart",
          "-pix_fmt yuv420p"
        ])
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    const videoBuffer = fs.readFileSync(outputPath);

    // -------- SEND VIDEO NOTE --------
    await conn.sendMessage(from, {
      video: videoBuffer,
      mimetype: "video/mp4",
      ptv: true, // 👈 Video Note
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

  } catch (e) {
    console.error(e);
    reply("*❌ Video Note create karanna bari una!*");
  }
});
