import { handleChatMember } from 'lib/bot';

export default async function (update) {
  await handleChatMember(update);
}
