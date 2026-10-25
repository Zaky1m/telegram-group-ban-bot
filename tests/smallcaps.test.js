import test from 'node:test';
import assert from 'node:assert/strict';
import { small } from 'lib/smallcaps';
import { iso, mono, link, esc } from 'lib/ui';

test('converts both cases of every letter', () => {
  assert.equal(small('abcdefghijklmnopqrstuvwxyz'), 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀѕᴛᴜᴠᴡxʏᴢ');
  assert.equal(small('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀѕᴛᴜᴠᴡxʏᴢ');
});

test('keeps digits, punctuation and non Latin text', () => {
  assert.equal(small('Page 2 of 10, ok?'), 'ᴘᴀɢᴇ 2 ᴏꜰ 10, ᴏᴋ?');
  assert.equal(small('مرحبا'), 'مرحبا');
});

test('keeps HTML tags and converts only the text inside them', () => {
  assert.equal(small('<b>Banned</b>'), '<b>ʙᴀɴɴᴇᴅ</b>');
  assert.equal(small('<tg-emoji emoji-id="123">🚫</tg-emoji> Done'), '<tg-emoji emoji-id="123">🚫</tg-emoji> ᴅᴏɴᴇ');
});

test('keeps HTML entities', () => {
  assert.equal(small('a &amp; b &lt;c&gt; &#x27;'), 'ᴀ &amp; ʙ &lt;ᴄ&gt; &#x27;');
});

test('keeps /commands, @usernames and links', () => {
  assert.equal(small('Use /addchat with @some_user'), 'ᴜѕᴇ /addchat ᴡɪᴛʜ @some_user');
  assert.equal(small('Open https://t.me/Some_Bot now'), 'ᴏᴘᴇɴ https://t.me/Some_Bot ɴᴏᴡ');
});

test('keeps isolated dynamic values such as names, ids and links', () => {
  assert.equal(small(`Account ${mono('Ab12')} of ${iso('Sam Smith')}`), `ᴀᴄᴄᴏᴜɴᴛ ${mono('Ab12')} ᴏꜰ ${iso('Sam Smith')}`);
  assert.equal(small(`By ${link('tg://user?id=1', 'Sam')}`), `ʙʏ ${link('tg://user?id=1', 'Sam')}`);
});

test('a name with markup characters stays escaped and untouched', () => {
  assert.equal(small(`Hi ${iso('<b>Bob</b>')}`), `ʜɪ ${iso('<b>Bob</b>')}`);
  assert.equal(esc('<b>'), '&lt;b&gt;');
});
