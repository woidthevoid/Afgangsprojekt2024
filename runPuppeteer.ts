import puppeteer from 'puppeteer';

async function runPuppeteer() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:9000/');
    console.log(await page.title());
    await browser.close();
}

runPuppeteer().catch((error) => {
    console.error('An error occurred during puppeteer:', error);
});