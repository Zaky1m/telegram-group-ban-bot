import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, failWhen } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';

const group = { id: -100123, type: 'supergroup' };
const telegram = { id: 777000, first_name: 'Telegram' };

beforeEach(reset);

const pinNotice = (pinned) => ({ message_id: 50, chat: group, from: telegram, pinned_message: pinned });

test('unpins a channel post that Telegram mirrored into the discussion group', async () => {
  await handleMessage(pinNotice({ message_id: 40, is_automatic_forward: true, sender_chat: { id: -1009 } }));
  assert.deepEqual(called('unpinChatMessage'), [{ chat_id: group.id, message_id: 40 }]);
});

test('still deletes the pin notice itself', async () => {
  await handleMessage(pinNotice({ message_id: 40, is_automatic_forward: true }));
  assert.deepEqual(called('deleteMessage'), [{ chat_id: group.id, message_id: 50 }]);
});

test('leaves a pin made by a person alone', async () => {
  await handleMessage(pinNotice({ message_id: 41, from: { id: 5 } }));
  assert.equal(called('unpinChatMessage').length, 0);
  assert.equal(called('deleteMessage').length, 1);
});

test('ignores a pinned message Telegram no longer exposes', async () => {
  await handleMessage(pinNotice({ message_id: 42, date: 0 }));
  assert.equal(called('unpinChatMessage').length, 0);
});

test('survives a missing pin right', async () => {
  failWhen('unpinChatMessage', () => 'not enough rights to manage pinned messages');
  await handleMessage(pinNotice({ message_id: 43, is_automatic_forward: true }));
  assert.equal(called('unpinChatMessage').length, 1);
  assert.equal(called('deleteMessage').length, 1);
});

test('does not unpin anything for a join notice', async () => {
  await handleMessage({ message_id: 54, chat: group, from: telegram, new_chat_members: [telegram] });
  assert.equal(called('unpinChatMessage').length, 0);
});
