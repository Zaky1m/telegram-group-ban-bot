import { handleMyChatMember } from 'lib/bot';

export default async function (update) {
  await handleMyChatMember(update);
}
