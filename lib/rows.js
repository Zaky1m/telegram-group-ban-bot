// Inline keyboards and the add-me links
import { api } from 'sdk';
import * as store from 'lib/store';
import * as T from 'lib/text';
import { btn, urlBtn, ICON, EMOJI } from 'lib/ui';

export const askRows = (code) => [[
  btn(T.BTN.confirm, `a:${code}`, 'success', ICON.go),
  btn(T.BTN.refuse, `c:${code}`, 'danger', ICON.end),
]];

export const chatRows = (code) => [[
  btn(T.BTN.confirm, `a:${code}`, 'success', ICON.go),
  btn(T.BTN.refuse, `c:${code}`, 'danger', ICON.end),
]];

export const hitRows = (code) => [[
  btn(T.BTN.ban, `a:${code}`, 'danger', ICON.go),
  btn(T.BTN.ok, `c:${code}`, 'primary', ICON.end),
]];

export const unbanRows = (code) => [[
  btn(T.BTN.unban, `a:${code}`, 'danger', ICON.go),
  btn(T.BTN.ok, `c:${code}`, 'primary', ICON.end),
]];

export const panelRows = () => [[
  btn(T.BTN.bans, 'v:b:1', 'primary', EMOJI.banned[0]),
  btn(T.BTN.chats, 'v:c:1', 'primary', EMOJI.chats[0]),
]];

export const backRow = () => [btn(T.BTN.back, 'v:h:1', 'danger', EMOJI.back[0])];

export function pageRows(kind, page, pages) {
  const nav = [];
  if (page > 1) nav.push(btn(T.BTN.prev, `v:${kind}:${page - 1}`, 'primary'));
  if (page < pages) nav.push(btn(T.BTN.next, `v:${kind}:${page + 1}`, 'primary'));
  return nav.length ? [nav, backRow()] : [backRow()];
}

// Shown to strangers: a blue button with an emoji that opens the source repository
export const sourceRows = () => [[urlBtn(T.BTN.runYours, T.REPO_URL, 'primary', EMOJI.star[0])]];

export const botUsername = () => store.getBotUsername(() => api.getMe());

export async function addRows() {
  const name = await botUsername();
  return [[
    urlBtn(T.BTN.addGroup, T.addGroupUrl(name), 'primary'),
    urlBtn(T.BTN.addChannel, T.addChannelUrl(name), 'primary'),
  ]];
}
