// Every bot message goes out from here: small caps for static text and colored buttons with premium emoji
import { api, BotApiError } from 'sdk';
import { small } from 'lib/smallcaps';

const FSI = '⁨';   // isolates a name or number from the direction of the surrounding line
const PDI = '⁩';

export const ICON = {
  go: '5864094912823174006',   // green check: any button that performs the action
  end: '5863950795195557842',  // red cross: any button that closes the request
};

export const EMOJI = {
  panel:   ['5868750545702888413', '📋'],
  banned:  ['5863760755777610188', '🚫'],
  chats:   ['5863960110979621137', '🗣'],
  alert:   ['5863775676493995526', '‼️'],
  done:    ['5863691288976564442', '✅'],
  star:    ['5863908429638148195', '⭐️'],
  broken:  ['5864010112988881953', '💔'],
  back:    ['5868407953341554235', '⬇️'],
  person:  ['5868515825740160914', '🪪'],
};

export function emo(name) {
  const e = EMOJI[name];
  return e ? `<tg-emoji emoji-id="${e[0]}">${e[1]}</tg-emoji>` : '';
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Any name or number inside a line is isolated so an Arabic or mixed value cannot reorder the line, and so small caps skips it
export function iso(s) {
  return FSI + esc(s) + PDI;
}

export function mono(s) {
  return FSI + '<code>' + esc(s) + '</code>' + PDI;
}

export function link(url, label) {
  return FSI + '<a href="' + esc(url) + '">' + esc(label) + '</a>' + PDI;
}

export function btn(text, data, style, icon) {
  const b = { text: small(text), callback_data: data };
  if (style) b.style = style;
  if (icon) b.icon_custom_emoji_id = icon;
  return b;
}

export function urlBtn(text, url, style, icon) {
  const b = { text: small(text), url };
  if (style) b.style = style;
  if (icon) b.icon_custom_emoji_id = icon;
  return b;
}

// Buttons without color or emoji, used when Telegram rejects the originals
function plain(rows) {
  return rows.map((row) => row.map((b) => {
    const c = { text: b.text };
    if (b.callback_data) c.callback_data = b.callback_data;
    if (b.url) c.url = b.url;
    return c;
  }));
}

// If Telegram rejects premium emoji the message is sent without them instead of failing
function noEmoji(text) {
  return String(text).replace(/<tg-emoji[^>]*>([\s\S]*?)<\/tg-emoji>/g, '$1');
}

function body(text, rows, extra) {
  const params = {
    text: small(text),
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...extra,
  };
  if (rows) params.reply_markup = { inline_keyboard: rows };
  return params;
}

export async function send(chatId, text, rows = null, extra = {}) {
  const params = { chat_id: chatId, ...body(text, rows, extra) };
  try {
    return await api.sendMessage(params);
  } catch (e) {
    if (!(e instanceof BotApiError)) throw e;
    params.text = noEmoji(params.text);
    if (rows) params.reply_markup = { inline_keyboard: plain(rows) };
    return api.sendMessage(params);
  }
}

export async function replyTo(message, text, rows = null) {
  const extra = {};
  if (message.chat.type !== 'private') {
    extra.reply_parameters = { message_id: message.message_id, allow_sending_without_reply: true };
  }
  if (message.is_topic_message && message.message_thread_id) {
    extra.message_thread_id = message.message_thread_id;
  }
  return send(message.chat.id, text, rows, extra);
}

export async function edit(chatId, messageId, text, rows = null) {
  const params = { chat_id: chatId, message_id: messageId, ...body(text, rows, {}) };
  try {
    return await api.editMessageText(params);
  } catch (e) {
    if (!(e instanceof BotApiError)) throw e;
    params.text = noEmoji(params.text);
    if (rows) params.reply_markup = { inline_keyboard: plain(rows) };
    try {
      return await api.editMessageText(params);
    } catch (e2) {
      if (!(e2 instanceof BotApiError)) throw e2;
    }
    return null;
  }
}

export async function drop(chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    await api.deleteMessage({ chat_id: chatId, message_id: messageId });
  } catch {}
}
