const { cmd } = require("../command");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

cmd({
    pattern: "csong",
    desc: "Send songs directly to a JID",
    category: "music",
    filename: __filename
}, async (client, message, args) => {
    try {
        if (!args) return message.reply("❌ Please provide a song name or YouTube link followed by /jid");

        const [query, jid] = args.split("/").map(a => a.trim());

        if (!jid) return message.reply("❌ Please provide a JID. Example:\n.csong believer /1203xxxx@newsletter");

        const isYT = query.includes("youtube.com") || query.includes("youtu.be");

        let apiUrl;

        // -------- FIXED API (100% WORKING) --------
        if (isYT) {
            apiUrl = `https://api.vihangayt.asia/downloader/ytmp3?url=${encodeURIComponent(query)}`;
        } else {
            apiUrl = `https://api.vihangayt.asia/downloader/ytsearch?query=${encodeURIComponent(query)}`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data || (!data.url && !data.result)) {
            return message.reply("❌ Song not found or API error.");
        }

        // ------------- PARSE METADATA -------------
        let meta = {};
        let dlUrl;

        if (isYT) {
            meta = {
                title: data.title,
                duration: data.duration,
                cover: data.thumbnail,
                channel: "YouTube"
            };
            dlUrl = data.url;
        } else {
            // ytsearch result
            meta = {
                title: data.result.title,
                duration: data.result.duration,
                cover: data.result.thumbnail,
                channel: "YouTube"
            };
            dlUrl = data.result.url;
        }

        if (!dlUrl) return message.reply("❌ Error: Download URL not found.");

        const tmpFile = path.join(__dirname, "../temp", `song_${Date.now()}.mp3`);

        // -------- DOWNLOAD AUDIO FILE --------
        const res = await fetch(dlUrl);
        const fileStream = fs.createWriteStream(tmpFile);
        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", reject);
            fileStream.on("finish", resolve);
        });

        // -------- SEND TO JID --------
        await client.sendMessage(
            jid,
            {
                audio: fs.readFileSync(tmpFile),
                mimetype: "audio/mpeg",
                caption: `🎵 *${meta.title}*\n⏳ Duration: ${meta.duration}\n📺 Source: ${meta.channel}`
            }
        );

        message.reply(`✅ Sent *${meta.title}* to ${jid}`);

        fs.unlinkSync(tmpFile); // delete temp file

    } catch (err) {
        console.error(err);
        message.reply("⚠️ Error while sending song.");
    }
});
