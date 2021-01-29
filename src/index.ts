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
  receiver.app.get('/access-token', cors, async (req, res) => {
    const { code, channel_id } = req.query;
    const integrated = await Bot.findOne({ channel_id });
    if (integrated) {
      return res.status(200).send({ success: false });
    }
    await Bot.create({
      channelId: channel_id,
      accessToken: code,
    });
    return res.status(200).send({ success: true });
  });
  await app.start((process.env.PORT as number | undefined) || 3000);

  console.log('⚡️ Bolt app is running!');
  setInterval(() => {
    fetch('https://prbot-slack.herokuapp.com')
      .then((_) => {
        console.log('keep the server running');
      })
      .catch((err) => console.log(err.message));
  }, 1000 * 60 * 20);
  app.event('app_mention', async ({ event: ev, client }) => {
    const channel = ev.channel;
    const event = ev as any;
    const url = event.text
      .split('<')[2]
      .split('')
      .slice(0, event.text.split('<')[2].split('').length - 1)
      .join('');
    try {
      await client.chat.postMessage({
        channel,
        token: '',
        text: `Hello <@${event.user}> you'll now receive daily updates on that repo😁`,
      });
    } catch (e) {
      console.log(e.message);
    }
    // const job = new CronJob(
    //   '00 00 8 * * *',
    //   async () => {
    //     console.log('run everyday at 8AM');
    //     const newURL = url + '/pulls';
    //     const browser = puppeteer.launch({
    //       args: ['--no-sandbox', '--disable-setuid-sandbox'],
    //     });
    //     const page = await (await browser).newPage();
    //     await page.goto(newURL);
    //     const PRLinks = await page.$$eval('a', (elements) =>
    //       elements
    //         .filter((element) => {
    //           return element.id.includes('issue');
    //         })
    //         .map((element) => {
    //           return {
    //             link: (element as HTMLLinkElement).href,
    //             content: element.textContent,
    //           };
    //         })
    //     );
    //     if (PRLinks.length === 0) {
    //       await say(`Hello. <@${event.user}>. There are no open PRs.`);
    //     } else {
    //       await say(
    //         `Hello. <@${event.user}>. Here are your open PRs for today`
    //       );
    //       PRLinks.forEach(
    //         async (el) =>
    //           await say(`${el.content}
    //     ${el.link}
    //     `)
    //       );
    //     }
    //     await (await browser).close();
    //   },
    //   null,
    //   true,
    //   'Europe/London'
    // );
    // job.start();
  });
})();
