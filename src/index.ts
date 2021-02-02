import puppeteer from 'puppeteer';
import app, { receiver } from './helpers/boltSetup';
import { db, __PROD__ } from './helpers/constants';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { CronJob } from 'cron';
import { connect } from 'mongoose';
import cors from 'cors';
import Bot from './models/slack';
import { WebClient } from '@slack/web-api';
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
      user: 'placeholder user to be replaced',
      urls: [],
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
      slackDetails.user = event.user;
      const urlsArray = [{ url }];
      slackDetails.urls = [
        ...slackDetails.urls.filter((el: { url: string }) => el.url !== url),
        ...urlsArray,
      ];
      await slackDetails.save();
      await client.chat.postMessage({
        channel: slackDetails.channelId,
        token: slackDetails.accessToken,
        text: `Hello <@${event.user}> you'll now receive daily updates on that repo😁`,
      });
      const job = new CronJob(
        '00 30 7 * * 0-6',
        async () => {
          let browser: Promise<puppeteer.Browser>;
          try {
            console.log('run everyday at 7:30AM UTC');
            const newURL = url + '/pulls';
            browser = puppeteer.launch({
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
          } catch (e) {
            console.log(e.message);
            await client.chat.postMessage({
              channel: slackDetails.channelId,
              token: slackDetails.accessToken,
              text: `Hello <@${event.user}> unfortunately, something went wrong. 
              you'll receive updates tomorrow. 
              `,
            });
            await (await browser!).close();
          }
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
  const slackDetails = (await Bot.find()) as any;
  /* Check if we're in Prod and if we've saved slack details before. If we have run the job again.
  This is useful incase the node process stopped running e.g. we started a new build 
  so the job in app.event('app_mention') stopped running. It will simply restart the job
  */
  if (__PROD__ && slackDetails && slackDetails.length >= 1) {
    let client: WebClient;
    let browser: Promise<puppeteer.Browser>;
    console.log("we're in prod and we have saved details before");
    const job = new CronJob(
      '00 30 7 * * 0-6',
      async () => {
        try {
          console.log(
            "we're in prod and we have saved details before from inside CRON"
          );
          console.log('run everyday at 7:30AM UTC');
          const slackDetails = (await Bot.find()) as any;
          for (const { urls, channelId, accessToken, user } of slackDetails) {
            for (const { url } of urls) {
              const newURL = url + '/pulls';
              browser = puppeteer.launch({
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
                  channel: channelId,
                  token: accessToken,
                  text: `Hello <@${user}>. There are no open PRs.`,
                });
              } else {
                await client.chat.postMessage({
                  channel: channelId,
                  token: accessToken,
                  text: `Hello. <@${user}>. Here are your open PRs for today`,
                });
                for (const { content, link } of PRLinks) {
                  await client.chat.postMessage({
                    channel: channelId,
                    token: accessToken,
                    text: `${content}
            ${link}
            `,
                  });
                }
              }
              await (await browser).close();
            }
          }
        } catch (e) {
          console.log(e.message);
          await client.chat.postMessage({
            channel: slackDetails.channelId,
            token: slackDetails.accessToken,
            text: `Hello <@${slackDetails.user}> unfortunately, something went wrong. 
            you'll receive updates tomorrow. 
            `,
          });
          await (await browser).close();
        }
      },
      null,
      true,
      'Europe/London'
    );
    job.start();
  }
})();
