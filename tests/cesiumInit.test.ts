import puppeteer, { Browser, Page } from 'puppeteer';

describe('Cesium test', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true, // Set to true if you want to run tests in headless mode
      slowMo: 50, // Slow down by 50ms to see the actions
    });
    page = await browser.newPage();

    await page.goto('http://localhost:9000'); // Ensure your server is running

    // Wait for the Cesium container to be present in the DOM
    await page.waitForSelector('#cesiumContainer'); // Use the correct selector for the Cesium container
  }, 60000); // Increase the timeout to 60 seconds

  afterAll(async () => {
    await browser.close();
  });

  test('should initialize Cesium', async () => {
    // Check if the Cesium container is present in the DOM
    const cesiumContainerExists = await page.evaluate(() => {
      const cesiumContainer = document.querySelector('#cesiumContainer');
      return !!cesiumContainer;
    });

    console.log('cesiumContainerExists:', cesiumContainerExists);
    expect(cesiumContainerExists).toBe(true);
  }, 60000); // Increase the timeout for the test to 60 seconds

  test('should add a drone to the map', async () => {
    const addDroneBtnPresent = await page.evaluate(() => {
        const addDroneBtn = document.getElementById('addDroneBtn');
        return !!addDroneBtn;
    });

    expect(addDroneBtnPresent).toBe(true);

    await page.click('#addDroneBtn');

    const droneDetails = await page.evaluate(() => {
        const view = (window as any).view;
        if(!view) {
            return null;
        }
        const droneEntity = view.getDroneEntity();
        return droneEntity ? droneEntity.id : null;
    });

    expect(droneDetails).toBe('drone-id');
  }, 60000);


});