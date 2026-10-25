import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'lib/text';
import { small } from 'lib/smallcaps';

const ARABIC = /[؀-ۿ]/;

const render = (value) => (typeof value === 'function' ? null : value);

test('no user-facing text contains Arabic', () => {
  for (const [name, value] of Object.entries(T)) {
    const text = JSON.stringify(render(value) ?? '');
    assert.doesNotMatch(text, ARABIC, name);
  }
});

test('every button label and command description is plain English', () => {
  for (const label of Object.values(T.BTN)) assert.match(label, /^[A-Za-z ]+$/);
  for (const c of [...T.COMMANDS, ...T.GROUP_COMMANDS]) {
    assert.match(c.command, /^[a-z]+$/);
    assert.ok(c.description.length >= 3 && c.description.length <= 256, c.command);
  }
});

test('welcome lists every registered command', () => {
  const text = T.welcome(null);
  for (const c of T.COMMANDS.filter((x) => x.command !== 'start')) assert.ok(text.includes(`/${c.command} `), c.command);
});

test('a warning message keeps the name and ids out of small caps', () => {
  const user = { id: 42, name: 'Sam', username: null };
  const text = small(T.warned('My Group', user, 2, 3));
  assert.ok(text.includes('My Group'));
  assert.ok(text.includes('Sam'));
  assert.ok(text.includes('>42<') || text.includes('42'));
  assert.ok(text.includes('ᴡᴀʀɴɪɴɢ'));
});

test('send converts static text and button labels to small caps without a direction mark', async () => {
  const { reset, called } = await import('./fake/sdk.mjs');
  const { send, btn } = await import('lib/ui');
  reset();
  await send(1, T.denied, [[btn(T.BTN.back, 'v:h:1')]]);
  const sent = called('sendMessage')[0];
  assert.ok(sent.text.includes('ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ'));
  assert.ok(!sent.text.includes('‏'));
  assert.equal(sent.reply_markup.inline_keyboard[0][0].text, 'ʙᴀᴄᴋ');
});
