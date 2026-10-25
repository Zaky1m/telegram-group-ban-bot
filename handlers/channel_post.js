import { handleMessage } from 'lib/bot';

export default async function (message) {
  await handleMessage(message, { isChannelPost: true });
}
