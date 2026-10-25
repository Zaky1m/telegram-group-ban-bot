import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { reset, called, failWhen } from './fake/sdk.mjs';
import { handleMessage } from 'lib/bot';

const group = { id: -100123, type: 'supergroup' };
const user = { id: 5, first_name: 'Sam' };

beforeEach(reset);

const NOTICES = {
  new_chat_members: [user],
  left_chat_member: user,
  pinned_message: { message_id: 1 },
  new_chat_title: 'New title',
  new_chat_photo: [{}],
  delete_chat_photo: true,
  video_chat_started: {},
  forum_topic_created: { name: 'topic' },
  boost_added: { boost_count: 1 },
  message_auto_delete_timer_changed: { message_auto_delete_time: 60 },
};

for (const [field, value] of Object.entries(NOTICES)) {
  test(`deletes the ${field} notice in a group`, async () => {
    await handleMessage({ message_id: 77, chat: group, from: user, date: 1, [field]: value });
    assert.deepEqual(called('deleteMessage'), [{ chat_id: group.id, message_id: 77 }]);
  });
}

test('deletes notices in channels', async () => {
  const chat = { id: -100999, type: 'channel' };
  await handleMessage({ message_id: 8, chat, new_chat_title: 'x' }, { isChannelPost: true });
  assert.deepEqual(called('deleteMessage'), [{ chat_id: chat.id, message_id: 8 }]);
});

test('keeps a giveaway, which is real content an admin posted', async () => {
  await handleMessage({ message_id: 9, chat: group, from: user, giveaway: {} });
  assert.equal(called('deleteMessage').length, 0);
});

test('never deletes service messages in a private chat', async () => {
  await handleMessage({ message_id: 10, chat: { id: 5, type: 'private' }, from: user, gift: {} });
  assert.equal(called('deleteMessage').length, 0);
});

test('works in chats that are not watched and ignores a missing delete right', async () => {
  const chat = { id: -999, type: 'group' };
  failWhen('deleteMessage', () => 'not enough rights to delete a message');
  await handleMessage({ message_id: 11, chat, from: user, new_chat_members: [user] });
  assert.equal(called('deleteMessage').length, 1);
});
