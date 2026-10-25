// Static English text is shown in small caps. The conversion happens at send time so the source strings stay plain.
const PLAIN = 'abcdefghijklmnopqrstuvwxyz';
const SMALL = Array.from('ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀѕᴛᴜᴠᴡxʏᴢ');
const MAP = new Map();
Array.from(PLAIN).forEach((ch, i) => {
  MAP.set(ch, SMALL[i]);
  MAP.set(ch.toUpperCase(), SMALL[i]);
});

// Left alone: HTML tags and entities, isolated data (names, ids, code; see iso/mono/link in ui.js), links, /commands and @usernames.
const KEEP = /(<[^>]*>|⁨[\s\S]*?⁩|&#?\w+;|https?:\/\/\S+|\/[A-Za-z_]+|@\w+)/;

export function small(text) {
  return String(text)
    .split(KEEP)
    .map((part, i) => (i % 2 ? part : Array.from(part, (ch) => MAP.get(ch) ?? ch).join('')))
    .join('');
}
