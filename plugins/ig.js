const axios = require("axios");
const { cmd } = require('../command');

// 🔐 Global session store (menuId -> media + chat)
global.activeIGMenus = global.activeIGMenus || new Map();

/* ================= IG COMMAND ================= */

cmd({
  pattern: "ig",
  alias: ["insta", "instagram"],
  desc: "Instagram Downloader (Full Fixed)",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q || !q.startsWith("https://")) {
      return reply("❌ Valid Instagram link ekak denna");
    }

    // ⏳ Fetching
    await conn.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    let data;
    try {
      const res = await axios.get(
        `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`,
        { timeout: 15000 }
      );
      data = res.data;
    } catch {
      // retry once
      const res = await axios.get(
        `https://api-aswin-sparky.koyeb.app/api/downloader/igdl?url=${encodeURIComponent(q)}`,
        { timeout: 15000 }
      );
      data = res.data;
    }

    if (!data?.status || !data.data?.length) {
      return reply("⚠️ Media load wenne naha. Passe try karanna.");
    }

    const media = data.data[0];

    // 📽️ Ready
    await conn.sendMessage(from, {
      react: { text: "📽️", key: m.key }
    });

    const menuMsg = await conn.sendMessage(from, {
      image: { url: media.thumbnail },
      caption: `
📥 *Instagram Downloader*

1️⃣ HD Video
2️⃣ Audio (MP3)

Reply with number 👇
> Unlimited requests allowed
      `
    }, { quoted: m });

    // 🔐 Save session
    global.activeIGMenus.set(menuMsg.key.id, {
      media,
      from
    });

    // 🧹 Auto clear after 10 minutes
    setTimeout(() => {
      global.activeIGMenus.delete(menuMsg.key.id);
    }, 10 * 60 * 1000);

  } catch (err) {
    console.error("IG CMD ERROR:", err);
    reply("❌ Unexpected error");
  }
});

/* ================= ONE GLOBAL LISTENER ================= */

cmd({
  on: "body"
}, async (conn, m) => {
  try {
    if (!m.message?.extendedTextMessage) return;

    const text = m.message.extendedTextMessage.text;
    const ctx = m.message.extendedTextMessage.contextInfo;
    if (!ctx?.stanzaId) return;

    const session = global.activeIGMenus.get(ctx.stanzaId);
    if (!session) return;

    const { media, from } = session;

    // ⬇️ Downloading
    await conn.sendMessage(from, {
      react: { text: "⬇️", key: m.key }
    });

    await new Promise(r => setTimeout(r, 600));

    // ⬆️ Uploading
    await conn.sendMessage(from, {
      react: { text: "⬆️", key: m.key }
    });

    if (text.trim() === "1") {
      if (media.type !== "video") return;

      await conn.sendMessage(from, {
        video: { url: media.url },
        caption: "✅ Video Ready"
      }, { quoted: m });

    } else if (text.trim() === "2") {

      await conn.sendMessage(from, {
        audio: { url: media.url },
        mimetype: "audio/mp4"
      }, { quoted: m });

    } else {
      return;
    }

    // ✔️ Sent
    await conn.sendMessage(from, {
      react: { text: "✔️", key: m.key }
    });

  } catch (e) {
    console.error("IG LISTENER ERROR:", e);
  }
});
