import puppeteer from 'puppeteer';
import app from './helpers/boltSetup';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { CronJob } from 'cron';
(async () => {
  config();
  await app.start((process.env.PORT as number | undefined) || 3000);

  console.log('⚡️ Bolt app is running!');
  setInterval(() => {
    fetch('https://prbot-slack.herokuapp.com')
      .then((_) => {
        console.log('keep the server running');
      })
      .catch((err) => console.log(err.message));
  }, 1000 * 60 * 20);
  app.event('app_mention', async ({ event: ev, say }) => {
    const event = ev as any;
    const url = event.text
      .split('<')[2]
      .split('')
      .slice(0, event.text.split('<')[2].split('').length - 1)
      .join('');
    await say(`Hello <@${event.user}> you'll receive daily updates at 8AM 😁`);
    const job = new CronJob(
      '00 43 11 * * *',
      async () => {
        console.log('run everyday at 8AM');
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
        await say(`Hello. <@${event.user}>. Here are your open PRs for today`);
        PRLinks.forEach(
          async (el) =>
            await say(`${el.content}
      ${el.link}
      `)
        );
        await (await browser).close();
      },
      null,
      true,
      'Europe/London'
    );
    job.start();
  });
})();
