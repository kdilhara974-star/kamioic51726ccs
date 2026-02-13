const { cmd } = require('../command');
const axios = require('axios');

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© Mr Hiruka (GPT-5) ✅",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=18002428478:+18002428478
END:VCARD`
        }
    }
};


cmd({
    pattern: "gpt",
    alias: [ "chatgpt", "openai", "ai2" ],
    desc: "Chat with GPT AI",
    category: "ai",
    react: "🤖",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, react }) => {
    try {

        if (!q) {
            return reply("🧠 Please provide a message.\nExample: `.gpt Hello`");
        }

        const apiUrl = `https://malvin-api.vercel.app/ai/gpt-5?text=${encodeURIComponent(q)}`;

        const { data } = await axios.get(apiUrl);

        if (!data || !data.result) {
            await react("❌");
            return reply("AI failed to respond.");
        }

        const responseMsg = `
🤖 *GPT-5 AI Response*  
━━━━━━━━━━━━━━━
${data.result}

> © Powerd by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`.trim();

        // ✅ Reply wela send karana thanama
        await conn.sendMessage(
            from,
            { text: responseMsg },
            { quoted: fakevCard }
        );

        await react("✅");

    } catch (e) {
        console.log(e);
        await react("❌");
        reply("Error communicating with AI.");
    }
});
