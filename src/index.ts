import puppeteer from 'puppeteer';
import schedule from 'node-schedule';
import app from './helpers/boltSetup';
import fetch from 'node-fetch';
import { config } from 'dotenv';
(async () => {
  config();
  await app.start((process.env.PORT as number | undefined) || 3000);
  console.log('⚡️ Bolt app is running!');
  setInterval(() => {
    fetch('https://prbot-slack.herokuapp.com')
      .then((resp) => {
        console.log('keep the server running');
      })
      .catch((err) => console.log(err.message));
  }, 1000 * 60 * 20);
  app.message('https://github.com', async ({ message: msg, say }) => {
    const message = msg as any;
    let url: string;
    console.log(message.text);
    if (message.text.includes('|') && message.text.includes('@')) {
      // includes @ and |
      url = message.text.split('|')[1].split('>')[0];
      console.log(url);
    } else if (message.text.includes('|')) {
      // includes just |
      url = message.text.split('|')[0].split('<')[1];
    } else if (message.text.includes('@')) {
      // includes just @
      url = message.text
        .split('<')[2]
        .split('')
        .slice(0, message.text.split('<')[2].split('').length - 1)
        .join('');
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
    const scheduler = schedule.scheduleJob(
      { hour: 22, minute: 42 },
      async function () {
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
        await say(
          `Hello. <@${message.user}>. Here are your open PRs for today`
        );
        PRLinks.forEach(
          async (el) =>
            await say(`${el.content}
      ${el.link}
      `)
        );
        await (await browser).close();
      }
    );
  });
})();
