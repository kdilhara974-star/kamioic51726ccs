const axios = require('axios');
const yts = require('yt-search');
const { cmd } = require('../command');

// Fake ChatGPT vCard
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
        // 1️⃣ Determine the query (text or replied message)
        let query = q?.trim();

        if (!query && m?.quoted) {
            query =
                m.quoted.message?.conversation ||
                m.quoted.message?.extendedTextMessage?.text ||
                m.quoted.text;
        }

        if (!query) {
            return reply("⚠️ Please provide a video name or YouTube link (or reply to a message).");
        }

        // 2️⃣ Convert Shorts link to normal link
        if (query.includes("youtube.com/shorts/")) {
            const videoId = query.split("/shorts/")[1].split(/[?&]/)[0];
            query = `https://www.youtube.com/watch?v=${videoId}`;
        }

        // 3️⃣ YouTube search
        const search = await yts(query);
        if (!search.videos.length) return reply("*❌ No results found.*");

        const data = search.videos[0];
        const ytUrl = data.url;
        const videoId = ytUrl.split('v=')[1]?.split('&')[0];

        // 5️⃣ Send selection menu (image + caption)
        const caption = `
*📽️ RANUMITHA-X-MD VIDEO DOWNLOADER 🎥*

*🎵 \`Title:\`* ${data.title}
*⏱️ \`Duration:\`* ${data.timestamp}
*📆 \`Uploaded:\`* ${data.ago}
*📊 \`Views:\`* ${data.views}
*🔗 \`Link:\`* ${data.url}

🔢 *Reply Below Number*

🎬 *Video FILE 📽️*
1️⃣ 144p Quality 🎬
2️⃣ 240p Quality 🎬
3️⃣ 360p Quality 🎬
4️⃣ 480p Quality 🎬
5️⃣ 720p Quality 🎬
6️⃣ 1080p Quality 🎬

📂 *Document FILE 📂*
7️⃣ 144p Quality 📂
8️⃣ 240p Quality 📂
9️⃣ 360p Quality 📂
🔟 480p Quality 📂
1️⃣1️⃣ 720p Quality 📂
1️⃣2️⃣ 1080p Quality 📂

> *For WhatsApp Compatible Videos, use options 3, 4, 5*

> © Powered by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption
        }, { quoted: fakevCard });

        const messageID = sentMsg.key.id;

        // WhatsApp Compatible API URLs
        const whatsappApis = {
            "144": `https://api.vevioz.com/api/button/mp4/${videoId}`,
            "240": `https://api.vevioz.com/api/button/mp4/${videoId}`,
            "360": `https://api.vevioz.com/api/button/mp4/${videoId}`,
            "480": `https://api.vevioz.com/api/button/mp4/${videoId}`,
            "720": `https://api.vevioz.com/api/button/mp4/${videoId}`,
            "1080": `https://api.vevioz.com/api/button/mp4/${videoId}`
        };

        // 6️⃣ Listen for user replies
        conn.ev.on("messages.upsert", async (msgData) => {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg?.message) return;

            const receivedText =
                receivedMsg.message.conversation ||
                receivedMsg.message.extendedTextMessage?.text;

            const senderID = receivedMsg.key.remoteJid;
            const isReplyToBot =
                receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToBot) {
                const option = receivedText.trim();
                let quality = "";
                let isDocument = false;

                // Quality mapping based on option
                switch (option) {
                    case "1": quality = "144"; break;
                    case "2": quality = "240"; break;
                    case "3": quality = "360"; break;
                    case "4": quality = "480"; break;
                    case "5": quality = "720"; break;
                    case "6": quality = "1080"; break;
                    case "7": quality = "144"; isDocument = true; break;
                    case "8": quality = "240"; isDocument = true; break;
                    case "9": quality = "360"; isDocument = true; break;
                    case "10": quality = "480"; isDocument = true; break;
                    case "11": quality = "720"; isDocument = true; break;
                    case "12": quality = "1080"; isDocument = true; break;
                    default:
                        return reply("*❌ Invalid option! Please choose 1-12.*");
                }

                // React ⬇️ when download starts
                await conn.sendMessage(senderID, { react: { text: '⬇️', key: receivedMsg.key } });

                try {
                    // WhatsApp Compatible API භාවිතා කරන්න (Vevioz API)
                    const apiUrl = whatsappApis[quality];
                    const { data: apiRes } = await axios.get(apiUrl, {
                        timeout: 30000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });

                    let downloadUrl = null;
                    let fileName = `${data.title.replace(/[^\w\s]/gi, '')} - ${quality}p.mp4`;

                    // Extract download URL from API response
                    if (apiRes && typeof apiRes === 'object') {
                        // Try different response formats
                        if (apiRes[quality]) {
                            downloadUrl = apiRes[quality];
                        } else if (apiRes.download) {
                            downloadUrl = apiRes.download;
                        } else if (apiRes.url) {
                            downloadUrl = apiRes.url;
                        } else if (apiRes.result?.url) {
                            downloadUrl = apiRes.result.url;
                            fileName = apiRes.result.filename || fileName;
                        }
                    }

                    if (!downloadUrl) {
                        throw new Error("Download URL not found");
                    }

                    // React ⬆️ before uploading
                    await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });

                    // WhatsApp තුළ ආරෝපණය කරන්න
                    if (isDocument) {
                        // Document ලෙස යවන්න
                        await conn.sendMessage(senderID, {
                            document: { url: downloadUrl },
                            mimetype: "video/mp4",
                            fileName: fileName,
                            caption: `*${data.title}*\n📊 Quality: ${quality}p\n⏱️ Duration: ${data.timestamp}\n📁 Sent as Document`
                        }, { quoted: receivedMsg });
                    } else {
                        // Video ලෙස යවන්න (WhatsApp Compatible)
                        await conn.sendMessage(senderID, {
                            video: { url: downloadUrl },
                            mimetype: "video/mp4",
                            caption: `*${data.title}*\n📊 Quality: ${quality}p\n⏱️ Duration: ${data.timestamp}\n✅ WhatsApp Compatible`,
                            // WhatsApp compatible settings
                            ptt: false,
                            gifPlayback: false,
                            seconds: data.duration?.seconds || 300
                        }, { quoted: receivedMsg });
                    }

                    // React ✅ after upload complete
                    await conn.sendMessage(senderID, { react: { text: '✅', key: receivedMsg.key } });

                } catch (error) {
                    console.error("Download Error:", error);
                    
                    // Fallback to alternative APIs
                    try {
                        await conn.sendMessage(senderID, { react: { text: '🔄', key: receivedMsg.key } });
                        
                        // Try alternative API 1
                        const altApi1 = `https://ytdl.samirdev.xyz/api?url=${encodeURIComponent(ytUrl)}&quality=${quality}`;
                        const { data: altRes1 } = await axios.get(altApi1);
                        
                        if (altRes1?.url) {
                            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
                            
                            if (isDocument) {
                                await conn.sendMessage(senderID, {
                                    document: { url: altRes1.url },
                                    mimetype: "video/mp4",
                                    fileName: `${data.title} - ${quality}p.mp4`,
                                    caption: `*${data.title}*\n📊 Quality: ${quality}p (Alternative API)`
                                }, { quoted: receivedMsg });
                            } else {
                                await conn.sendMessage(senderID, {
                                    video: { url: altRes1.url },
                                    mimetype: "video/mp4",
                                    caption: `*${data.title}*\n📊 Quality: ${quality}p\n⏱️ Duration: ${data.timestamp}\n🔧 Alternative API`,
                                    ptt: false,
                                    gifPlayback: false
                                }, { quoted: receivedMsg });
                            }
                            
                            await conn.sendMessage(senderID, { react: { text: '✅', key: receivedMsg.key } });
                            return;
                        }
                        
                        // Try alternative API 2
                        const altApi2 = `https://api.dlyoutube.com/api/button/mp4/${videoId}`;
                        const { data: altRes2 } = await axios.get(altApi2);
                        
                        if (altRes2 && altRes2[quality]) {
                            await conn.sendMessage(senderID, { react: { text: '⬆️', key: receivedMsg.key } });
                            
                            if (isDocument) {
                                await conn.sendMessage(senderID, {
                                    document: { url: altRes2[quality] },
                                    mimetype: "video/mp4",
                                    fileName: `${data.title} - ${quality}p.mp4`
                                }, { quoted: receivedMsg });
                            } else {
                                await conn.sendMessage(senderID, {
                                    video: { url: altRes2[quality] },
                                    mimetype: "video/mp4",
                                    caption: `*${data.title}*\n📊 Quality: ${quality}p\n⏱️ Duration: ${data.timestamp}`,
                                    ptt: false,
                                    gifPlayback: false
                                }, { quoted: receivedMsg });
                            }
                            
                            await conn.sendMessage(senderID, { react: { text: '✅', key: receivedMsg.key } });
                            return;
                        }
                        
                        // All APIs failed
                        await conn.sendMessage(senderID, { react: { text: '❌', key: receivedMsg.key } });
                        reply("❌ All download methods failed. The video may not be available or too large for WhatsApp.");
                        
                    } catch (fallbackError) {
                        console.error("Fallback Error:", fallbackError);
                        await conn.sendMessage(senderID, { react: { text: '❌', key: receivedMsg.key } });
                        reply("❌ Download failed. Please try a different video or quality.");
                    }
                }
            }
        });

    } catch (error) {
        console.error("Video Command Error:", error);
        reply("❌ An error occurred while processing your request. Please try again later.");
    }
});
