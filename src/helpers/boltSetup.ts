import { App } from '@slack/bolt';
import { config } from 'dotenv';
config();
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});
export default app;
