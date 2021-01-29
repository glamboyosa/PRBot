import { App, ExpressReceiver } from '@slack/bolt';
import { config } from 'dotenv';
config();
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET as string,
});
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});
export { receiver };
export default app;
