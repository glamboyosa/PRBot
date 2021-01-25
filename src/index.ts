import puppeteer from 'puppeteer';
import schedule from 'node-schedule';
import app from './helpers/boltSetup';
import { config } from 'dotenv';
(async () => {
  config();
  await app.start((process.env.PORT as number | undefined) || 3000);

  console.log('⚡️ Bolt app is running!');
  app.message('https://github.com', async ({ message, say }) => {
    let url: string;
    if (message.text.includes('@')) {
      const splitString = message.text
        .split('<')[2]
        .split('')
        .slice(0, message.text.split('<')[2].split('').length - 1)
        .join('');
      url = splitString;
    } else {
      url = message.text
        .split('<')[1]
        .split('')
        .slice(0, message.text.split('<')[1].split('').length - 1)
        .join('');
    }
    await say(
      `Hello <@${message.user}> you'll receive daily updates at 8AM 😁`
    );
    const scheduler = schedule.scheduleJob('*/1 * * * *', async function () {
      const newURL = url + '/pulls';
      const browser = puppeteer.launch();
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
      console.log(PRLinks);
      await say(`Hello. <@${message.user}>. Here are your open PRs for today`);
      PRLinks.forEach(
        async (el) =>
          await say(`${el.content}
      ${el.link}
      `)
      );
      await (await browser).close();
    });
  });
})();
