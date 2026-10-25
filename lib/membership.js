// Members joining and the bot itself being added, promoted or removed
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { askAll, notifyAll, sweep } from 'lib/admins';
import { isDirect, safeBan } from 'lib/enforce';
import { addRows, chatRows } from 'lib/rows';

export async function handleChatMember(cmu) {
  await sweep();
  const chat = cmu.chat;
  if (!(await store.hasChat(chat.id))) return;
  const member = cmu.new_chat_member;
  if (!member) return;
  if (member.status !== 'member' && member.status !== 'restricted') return;
  if (await store.isBanned(member.user.id)) {
    await safeBan(chat.id, member.user.id);
    await store.setBannedInfo(member.user.id, T.fullName(member.user), member.user.username || null);
  }
}

// The bot must be an admin with the rights to ban members and delete messages, otherwise it leaves at once
export async function handleMyChatMember(cmu) {
  await sweep();
  const chat = cmu.chat;
  const member = cmu.new_chat_member;
  const status = member.status;
  const adminId = await store.getAdminId();
  const title = chat.title || String(chat.id);

  if (status === 'left' || status === 'kicked') {
    if (await store.removeChat(chat.id)) await notifyAll(T.goneFromChat(title, chat.id));
    return;
  }
  if (chat.type === 'private') return;
  if (await isDirect(chat)) {
    await store.removeChat(chat.id);
    return;
  }

  const enough = status === 'creator' ||
    (status === 'administrator' && member.can_restrict_members && member.can_delete_messages);

  if (!enough) {
    await store.removeChat(chat.id);
    try {
      await api.leaveChat({ chat_id: chat.id });
    } catch {}
    await notifyAll(T.leftNoRights(title, chat.id), await addRows());
    return;
  }

  if (await store.hasChat(chat.id)) {
    await store.addChat(chat.id, title, chat.type);
    return;
  }
  if (adminId == null) return;

  const code = await store.createPending({ kind: 'chat', chatId: chat.id, expiresAt: 0 });
  await askAll(code, T.newChat(title, chat.id, chat.type), chatRows(code));
}
