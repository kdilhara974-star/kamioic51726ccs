const axios = require("axios");
const yts = require("yt-search");
const { cmd } = require("../command");

// ================= FAKE VCARD =================
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
TEL;waid=94762095304:+94762095304
END:VCARD`
        }
    }
};

// ================= REPLY CACHE =================
const pendingReplies = new Map();

// ================= COMMAND =================
cmd({
    pattern: "video",
    alias: "ytvideo",
    react: "🎬",
    desc: "Download YouTube MP4",
    category: "download",
    use: ".video <query>",
    filename: __filename
}, async (conn, mek, m, { from, reply, q }) => {
    try {
        let query = q?.trim();

        if (!query && m?.quoted) {
            query =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text;
        }

        if (!query) return reply("⚠️ Video name or link ekak denna");

        // Shorts → normal
        if (query.includes("youtube.com/shorts/")) {
            const id = query.split("/shorts/")[1].split(/[?&]/)[0];
            query = `https://www.youtube.com/watch?v=${id}`;
        }

        const search = await yts(query);
        if (!search.videos.length) return reply("❌ No results found");

        const data = search.videos[0];

        const formats = {
            "240p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${data.url}&format=240`,
            "360p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${data.url}&format=360`,
            "480p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${data.url}&format=480`,
            "720p": `https://api.nekolabs.my.id/downloader/youtube/v1?url=${data.url}&format=720`
        };

        const caption = `
🎬 *RANUMITHA-X-MD VIDEO*

📌 *${data.title}*
⏱ ${data.timestamp}
👁 ${data.views}

Reply with:

1.1 – 240p Video
1.2 – 360p Video
1.3 – 480p Video
1.4 – 720p Video

2.1 – 240p Document
2.2 – 360p Document
2.3 – 480p Document
2.4 – 720p Document
`;

        const sent = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption
        }, { quoted: fakevCard });

        pendingReplies.set(sent.key.id, {
            formats,
            chat: from
        });

    } catch (e) {
        console.error(e);
        reply("❌ Error occurred");
    }
});

// ================= GLOBAL LISTENER =================
module.exports = (conn) => {
    conn.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message?.extendedTextMessage) return;

            const ctx = msg.message.extendedTextMessage.contextInfo;
            const repliedId = ctx?.stanzaId;
            if (!pendingReplies.has(repliedId)) return;

            const text = msg.message.extendedTextMessage.text.trim();
            const { formats, chat } = pendingReplies.get(repliedId);

            let quality, isDoc = false;

            if (text === "1.1") quality = "240p";
            else if (text === "1.2") quality = "360p";
            else if (text === "1.3") quality = "480p";
            else if (text === "1.4") quality = "720p";
            else if (text === "2.1") quality = "240p", isDoc = true;
            else if (text === "2.2") quality = "360p", isDoc = true;
            else if (text === "2.3") quality = "480p", isDoc = true;
            else if (text === "2.4") quality = "720p", isDoc = true;
            else return;

            pendingReplies.delete(repliedId);

            await conn.sendMessage(chat, { react: { text: "⬇️", key: msg.key } });

            const { data } = await axios.get(formats[quality]);
            const url = data?.result?.downloadUrl || data?.result?.download;
            if (!url) return;

            await conn.sendMessage(chat, { react: { text: "⬆️", key: msg.key } });

            await conn.sendMessage(
                chat,
                isDoc
                    ? {
                          document: { url },
                          mimetype: "video/mp4",
                          fileName: "video.mp4"
                      }
                    : {
                          video: { url },
                          mimetype: "video/mp4"
                      },
                { quoted: msg }
            );

            await conn.sendMessage(chat, { react: { text: "✔️", key: msg.key } });

        } catch (err) {
            console.error("Listener Error:", err);
        }
    });
};
