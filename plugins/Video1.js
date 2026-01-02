const { cmd } = require('../command');
const yts = require('yt-search');
const axios = require('axios');

// store active menu messages
const videoMenu = new Map();

cmd({
    pattern: "video1",
    react: "🎬",
    desc: "Download YouTube MP4",
    category: "download",
    use: ".video1 <query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        if (!q) return reply("❓ *Please provide a video name or link!*");

        const search = await yts(q);
        if (!search.videos.length) return reply("❌ No results found.");

        const data = search.videos[0];
        const ytUrl = data.url;

        const formats = {
            "240p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=240`,
            "360p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=360`,
            "480p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=480`,
            "720p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(ytUrl)}&format=720`
        };

        const caption = `
🎥 *Video Downloader* 📥

📌 *Title:* ${data.title}
⏱️ *Duration:* ${data.timestamp}
👁️ *Views:* ${data.views}

🔢 *Reply with number*

🎬 *Video*
1.1 240p
1.2 360p
1.3 480p
1.4 720p

📁 *Document*
2.1 240p
2.2 360p
2.3 480p
2.4 720p

> © 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

        const sent = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption
        }, { quoted: m });

        videoMenu.set(sent.key.id, {
            from,
            formats
        });

    } catch (e) {
        console.error(e);
        reply("❌ Error occurred.");
    }
});

// ONE GLOBAL LISTENER (IMPORTANT)
cmd.onMessage = async (conn, msg) => {
    try {
        const m = msg.messages?.[0];
        if (!m?.message) return;

        const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text;

        const ctx = m.message.extendedTextMessage?.contextInfo;
        if (!ctx?.stanzaId) return;

        const menu = videoMenu.get(ctx.stanzaId);
        if (!menu) return;

        const sender = m.key.remoteJid;

        let quality;
        let isDoc = false;

        switch (text.trim()) {
            case "1.1": quality = "240p"; break;
            case "1.2": quality = "360p"; break;
            case "1.3": quality = "480p"; break;
            case "1.4": quality = "720p"; break;

            case "2.1": quality = "240p"; isDoc = true; break;
            case "2.2": quality = "360p"; isDoc = true; break;
            case "2.3": quality = "480p"; isDoc = true; break;
            case "2.4": quality = "720p"; isDoc = true; break;

            default: return;
        }

        // ⬇️ Download react
        await conn.sendMessage(sender, {
            react: { text: '⬇️', key: m.key }
        });

        const { data } = await axios.get(menu.formats[quality]);
        if (!data?.success) return;

        // ⬆️ Upload react
        await conn.sendMessage(sender, {
            react: { text: '⬆️', key: m.key }
        });

        if (isDoc) {
            await conn.sendMessage(sender, {
                document: { url: data.result.downloadUrl },
                mimetype: "video/mp4",
                fileName: `${data.result.title}.mp4`
            }, { quoted: m });
        } else {
            await conn.sendMessage(sender, {
                video: { url: data.result.downloadUrl },
                mimetype: "video/mp4"
            }, { quoted: m });
        }

        // ✔️ Done react
        await conn.sendMessage(sender, {
            react: { text: '✔️', key: m.key }
        });

        videoMenu.delete(ctx.stanzaId);

    } catch (e) {
        console.error(e);
    }
};
