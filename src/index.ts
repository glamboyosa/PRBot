import puppeteer from 'puppeteer';
import schedule from 'node-schedule';
(async () => {
  let schedula: schedule.Job;
  const scheduler = schedule.scheduleJob('*/1 * * * *', function () {
    console.log('Today is recognized by Rebecca Black!');
  });
  const browser = puppeteer.launch();
  const page = await (await browser).newPage();
  await page.goto('https://github.com/tannerlinsley/react-query/pulls');
  const links = await page.$$eval('a', (elements) =>
    elements
      .filter((element) => {
        return element.id.includes('issue');
      })
      .map((element) => {
        return {
          links: (element as HTMLLinkElement).href,
          content: element.textContent,
        };
      })
  );
  console.log(links);
  await (await browser).close();
})();
