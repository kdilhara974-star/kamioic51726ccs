const { cmd } = require("../command");

// Stylized text map
const styleMap = {
  a: "🅐", b: "🅑", c: "🅒", d: "🅓", e: "🅔", f: "🅕", g: "🅖",
  h: "🅗", i: "🅘", j: "🅙", k: "🅚", l: "🅛", m: "🅜", n: "🅝",
  o: "🅞", p: "🅟", q: "🅠", r: "🅡", s: "🅢", t: "🅣", u: "🅤",
  v: "🅥", w: "🅦", x: "🅧", y: "🅨", z: "🅩",
  "0": "⓿", "1": "➊", "2": "➋", "3": "➌", "4": "➍",
  "5": "➎", "6": "➏", "7": "➐", "8": "➑", "9": "➒"
};

// Command metadata
const chrCommand = {
  pattern: "chr",
  alias: ["creact","rch","channelreact","channelr"],
  react: "🎡",
  desc: "React to channel messages with stylized text",
  category: "owner",
  use: ".chr <channel-link> <text>",
  filename: __filename
};

// Command handler
cmd(chrCommand, async (client, _, __, { from, body, isCmd, command, args, q, isCreator, reply }) => {
  try {
    if (!isCreator) return reply("*🚫 Owner only command!*");

    if (!q) return reply(`Usage:\n*.${command} https://whatsapp.com/channel/1234567890 💙*`);

    const [link, ...textParts] = q.split(" ");
    if (!link.includes("whatsapp.com/channel/")) return reply("Invalid channel link format");

    const text = textParts.join(" ").toLowerCase();
    if (!text) return reply("Please provide text to convert");

    // Convert text to stylized version
    const styledText = text.split('').map(ch => ch === " " ? "―" : styleMap[ch] || ch).join('');

    // Extract IDs from channel link
    const inviteId = link.split("/")[4];
    const messageId = link.split("/")[5];
    if (!inviteId || !messageId) return reply("Invalid link - missing IDs");

    // Fetch channel metadata and react
    const metadata = await client.newsletterMetadata("invite", inviteId);
    await client.newsletterReactMessage(metadata.id, messageId, styledText);

    reply(
      `╭━━━〔 *RANUMITHA-X-MD* 〕━━━┈⊷\n` +
      `┃▸ *Status:* *Reaction sent ✅*\n` +
      `┃▸ *Channel:* ${metadata.name}\n` +
      `┃▸ *Reaction:* ${styledText}\n` +
      `╰────────────────┈⊷\n` +
      `> © Powerd by 𝗥𝗔𝗡𝗨𝗠𝗜𝗧𝗛𝗔-𝗫-𝗠𝗗 🌛`
    );

  } catch (err) {
    console.error(err);
    reply("Error: " + (err.message || "Failed to send reaction"));
  }
});
