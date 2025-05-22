const puppeteer = require('puppeteer');
require('dotenv').config();


const LONG_TIME_OUT = process.env.LONG_TIME_OUT;
const AVG_TIME_OUT = process.env.AVG_TIME_OUT;
const SHORT_TIME_OUT = process.env.SHORT_TIME_OUT;
const DAILYMAIL_URL = process.env.DAILYMAIL_URL;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--window-position=920,0',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();

  // Sử dụng userAgent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
  });

  try {
    // Mở trang
    await page.goto(DAILYMAIL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('✅ Đã access vào trang.');

    await delay(AVG_TIME_OUT);

    // const frames = page.frames();
    // const cookieFrame = frames.find(f => f.url().includes('consent'));

    // if (cookieFrame) {
    //     const button = await cookieFrame.waitForSelector('button.sp_choice_type_11', { timeout: LONG_TIME_OUT });
    //     await button.click();
    //     console.log('✅ Đã click vào nút accept cookie trong iframe.');
    // } else {
    //     console.log('⚠️ Không tìm thấy iframe chứa cookie.');
    // }
    // await delay(SHORT_TIME_OUT);

    // Load content
    await page.waitForSelector('.alpha .articletext a', { timeout: 5000 });
    console.log('✅ Posts content đã load.');

    // scroll to the bottom of the page
    // await page.evaluate(async () => {
    //   await new Promise((resolve) => {
    //     let totalHeight = 0;
    //     const distance = 500;
    //     const timer = setInterval(() => {
    //       const scrollHeight = document.body.scrollHeight;
    //       window.scrollBy(0, distance);
    //       totalHeight += distance;

    //       if (totalHeight >= scrollHeight) {
    //         clearInterval(timer);
    //         resolve();
    //       }
    //     }, 200); // delay giữa các lần scroll (200ms)
    //   });
    // });

    // Tìm tất cả post
    const posts = await page.$$('.alpha .articletext');
    console.log(`🔎 Tìm thấy ${posts.length} posts.`);

    const data = [];
    for (const post of posts) {
        const link = await post.evaluate(el => {
          const a = el.querySelector('a');
          return a ? a.href : null;
        });
        
        // Bỏ qua link đặc biệt
        // if (link.includes('football/video') 
        // || link.includes('football/live-blog')
        // || link.includes('/live/')
        // ){
        //   continue;
        // }

        data.push({ link: link });
    }
    console.log("✅ Danh sách bài viết:", data);

    const results = [];

    let n = 0;
    for (const item of data) {
        n++;
        if (n > 2) {continue;}
        const { link } = item;
        try {
            await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

            const title = await page.$eval('#js-article-text h1', el => el.innerText.trim()).catch(() => '');
            console.log("title: " + title);

            const content = await page.$$eval(
              'div[itemprop="articleBody"] p',
              elements => elements.map(el => el.innerText.trim()).join('\n')
            ).catch(() => '');
            console.log("content: " + content);

            const published_date = await page.$eval('.article-timestamp-published time', el => el.innerText.trim()).catch(() => '');
            console.log("published_date: " + published_date);

            results.push({
                title,
                link,
                published_date,
                content,
            });

            console.log(`✅ Đã lấy dữ liệu từ: ${link}`);
        } catch (err) {
            console.log(`❌ Lỗi khi xử lý link: ${link}`, err);
        }
    }

    console.log("Result: " + JSON.stringify(results));

    console.log('🎉 Xong rồi!');
  } catch (err) {
    console.error('❌ Lỗi trong quá trình xử lý:', err.message);
  } finally {
    await browser.close();
  }
})();

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}