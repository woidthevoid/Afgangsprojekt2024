import puppeteer, { Browser, Page } from 'puppeteer';

describe('CesiumView Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Set to true if you want to run tests in headless mode
      slowMo: 50, // Slow down by 50ms to see the actions
    });
    page = await browser.newPage();

    // Capture console logs from the browser context
    page.on('console', (msg) => {
      for (let i = 0; i < msg.args().length; ++i) {
        console.log(`${msg.text()}`);
      }
    });

    await page.goto('http://localhost:9000'); // Ensure your server is running

    // Wait for the Cesium container to be present in the DOM
    await page.waitForSelector('#cesiumContainer'); // Use the correct selector for the Cesium container
  }, 60000); // Increase the timeout to 60 seconds

  afterAll(async () => {
    await browser.close();
  });

  test('should add a drone', async () => {
    // Ensure that addDrone is available
    const addDroneAvailable = await page.evaluate(() => {
      return typeof (window as any).addDrone === 'function';
    });

    expect(addDroneAvailable).toBe(true);

    // Call the addDrone function and log any errors
    const addDroneResult = await page.evaluate(() => {
      try {
        (window as any).addDrone('drone1', 10.0, 20.0, 100.0);
        return { success: true };
      } catch (error) {
        console.error('Error adding drone:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    console.log('addDroneResult:', addDroneResult);
    expect(addDroneResult.success).toBe(true);

    // Wait for the drone to be added and log its details
    const droneDetails = await page.evaluate(() => {
      const view = (window as any).view;
      if (!view) {
        console.error('view is not defined');
        return null;
      }
      const droneEntity = view.getDroneEntity();
      console.log('droneEntity:', droneEntity);
      return droneEntity ? droneEntity.id : null;
    });

    console.log('droneDetails:', droneDetails);
    expect(droneDetails).toBe('drone-entity');
  }, 60000); // Increase the timeout for the test to 60 seconds

  // Add more tests for other methods
});