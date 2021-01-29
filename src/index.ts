import puppeteer from 'puppeteer';
import app, { receiver } from './helpers/boltSetup';
import { db, __PROD__ } from './helpers/constants';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { CronJob } from 'cron';
import { connect } from 'mongoose';
import cors from 'cors';
import Bot from './models/slack';
(async () => {
  config();
  connect(db!, { useNewUrlParser: true }, () => {
    console.log(`connected to ${__PROD__ ? 'production DB' : 'local DB'}`);
  });
  receiver.app.use(cors());
  receiver.app.get('/access-token', async (req, res) => {
    const { code, channel_id } = req.query;
    /* user wants to reintegrate bot to a channel it was previously in likely because access was revoked
    simply update with new token */
    const integrated = await Bot.findOneAndUpdate(
      { channelId: channel_id },
      { accessToken: code },
      { new: true }
    );
    if (integrated) {
      return res.status(200).send({ success: true });
    }
    await Bot.create({
      channelId: channel_id,
      accessToken: code,
    });
    return res.status(200).send({ success: true });
  });
  await app.start((process.env.PORT as number | undefined) || 3000);

  console.log('⚡️ Bolt app is running!');
  // keep Heroku from sleeping after 30 mins
  setInterval(() => {
    fetch('https://prbot-slack.herokuapp.com')
      .then((_) => {
        console.log('keep the server running');
      })
      .catch((err) => console.log(err.message));
  }, 1000 * 60 * 20);
  app.event('app_mention', async ({ event: ev, client }) => {
    const channelId = ev.channel;
    const event = ev as any;
    const url = event.text
      .split('<')[2]
      .split('')
      .slice(0, event.text.split('<')[2].split('').length - 1)
      .join('');
    try {
      const slackDetails = (await Bot.findOne({ channelId })) as any;
      await client.chat.postMessage({
        channel: slackDetails.channelId,
        token: slackDetails.accessToken,
        text: `Hello <@${event.user}> you'll now receive daily updates on that repo😁`,
      });
      const job = new CronJob(
        '00 00 9 * * *',
        async () => {
          console.log('run everyday at 9AM UTC');
          const newURL = url + '/pulls';
          const browser = puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });
          const page = await (await browser).newPage();
          await page.goto(newURL);
          const PRLinks = await page.$$eval('a', (elements) =>
            elements
              .filter((element) => {
                return element.id.includes('issue');
              })
              .map((element) => {
                return {
                  link: (element as HTMLLinkElement).href,
                  content: element.textContent,
                };
              })
          );
          if (PRLinks.length === 0) {
            await client.chat.postMessage({
              channel: slackDetails.channelId,
              token: slackDetails.accessToken,
              text: `Hello <@${event.user}>. There are no open PRs.`,
            });
          } else {
            await client.chat.postMessage({
              channel: slackDetails.channelId,
              token: slackDetails.accessToken,
              text: `Hello. <@${event.user}>. Here are your open PRs for today`,
            });
            for (const { content, link } of PRLinks) {
              await client.chat.postMessage({
                channel: slackDetails.channelId,
                token: slackDetails.accessToken,
                text: `${content}
              ${link}
              `,
              });
            }
          }
          await (await browser).close();
        },
        null,
        true,
        'Europe/London'
      );
      job.start();
    } catch (e) {
      console.log(e.message);
    }
  });
})();
