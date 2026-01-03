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
  filename: __filename,
}, async (conn, mek, m, { from, reply }) => {
  try {
    if (!m.quoted || m.quoted.mtype !== "videoMessage") {
      return reply("❌ Video ekakata reply karanna");
    }

    await conn.sendMessage(from, { react: { text: "⬇️", key: mek.key } });

    const buffer = await m.quoted.download();

    const input = path.join(__dirname, "../temp/in.mp4");
    const output = path.join(__dirname, "../temp/out.mp4");

    fs.writeFileSync(input, buffer);

    await conn.sendMessage(from, { react: { text: "⬆️", key: mek.key } });

    await new Promise((res, rej) => {
      ffmpeg(input)
        .outputOptions([
          "-vf scale=480:480:force_original_aspect_ratio=increase,crop=480:480",
          "-c:v libx264",
          "-profile:v baseline",
          "-level 3.0",
          "-pix_fmt yuv420p",
          "-r 25",
          "-c:a aac",
          "-b:a 96k",
          "-movflags +faststart",
          "-t 60"
        ])
        .on("end", res)
        .on("error", rej)
        .save(output);
    });

    const final = fs.readFileSync(output);

    // 🔥 THIS IS THE KEY PART
    await conn.sendMessage(from, {
      video: final,
      mimetype: "video/mp4",
      ptv: true,
      videoNote: true, // 👈 VERY IMPORTANT
    }, { quoted: mek });

    await conn.sendMessage(from, { react: { text: "✔️", key: mek.key } });

    fs.unlinkSync(input);
    fs.unlinkSync(output);

  } catch (e) {
    console.log(e);
    reply("❌ Video note convert error");
  }
});
