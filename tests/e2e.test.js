const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, '../');
const MOCK_HTML_PATH = path.join(__dirname, 'mock-site/index.html');
const MOCK_HTML_CONTENT = fs.readFileSync(MOCK_HTML_PATH, 'utf8');

describe('AI Task Completion Notifier E2E', () => {
    let browser;
    let page;
    let worker;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false, // Must be false to support extensions usually
            args: [
                `--disable-extensions-except=${EXTENSION_PATH}`,
                `--load-extension=${EXTENSION_PATH}`,
                '--no-sandbox'
            ]
        });
        // Give the extension service worker time to initialize
        await new Promise(r => setTimeout(r, 1000));

        // Find the extension service worker
        const workerTarget = await browser.waitForTarget(
            target => target.type() === 'service_worker'
        );
        worker = await workerTarget.worker();
    });

    afterAll(async () => {
        if (browser) await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', request => {
            // Intercept navigation to the target site and serve our mock content
            if (request.url().includes('chatgpt.com/test') ||
                request.url().includes('gemini.google.com/test') ||
                request.url().includes('claude.ai/test')) {
                request.respond({
                    status: 200,
                    contentType: 'text/html',
                    body: MOCK_HTML_CONTENT
                });
            } else {
                request.continue();
            }
        });
    });

    afterEach(async () => {
        if (page) await page.close();
    });

    // Helper to poll for notifications
    async function waitForNotification(timeout = 2000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const notifications = await worker.evaluate(() => {
                return new Promise(r => chrome.notifications.getAll(r));
            });
            if (Object.keys(notifications).length > 0) {
                return true;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        throw new Error(`Notification not found after ${timeout}ms`);
    }

    test('Should display hourglass when ChatGPT task starts', async () => {
        // Navigate to a fake URL on the target domain
        await page.goto('https://chatgpt.com/test');

        // Initial title should exclude hourglass
        const initialTitle = await page.title();
        expect(initialTitle).not.toMatch(/⏳/);

        // Click start button
        // "Start ChatGPT Task" button creates a button with data-testid="stop-button"
        await page.click('#start-chatgpt');

        // Wait for usage of the title to verify it changed
        await page.waitForFunction(() => document.title.includes('⏳'), { timeout: 2000 });

        // Check title for hourglass
        const generatingTitle = await page.title();
        expect(generatingTitle).toMatch(/⏳/);

        // Click stop button (simulating generation end)
        // This removes the stop button from DOM
        await page.click('#stop-task');

        // Wait for usage of the title to verify it reverted
        await page.waitForFunction(() => !document.title.includes('⏳'), { timeout: 2000 });

        // Title should revert
        const finalTitle = await page.title();
        expect(finalTitle).not.toMatch(/⏳/);

        // Verify notification
        await waitForNotification();
    });

    test('Should display hourglass when Gemini task starts', async () => {
        await page.goto('https://gemini.google.com/test');

        const initialTitle = await page.title();
        expect(initialTitle).not.toMatch(/⏳/);

        await page.click('#start-gemini'); // Injects button[aria-label="Stop response"]

        await page.waitForFunction(() => document.title.includes('⏳'), { timeout: 2000 });
        const generatingTitle = await page.title();
        expect(generatingTitle).toMatch(/⏳/);

        await page.click('#stop-task');
        await page.waitForFunction(() => !document.title.includes('⏳'), { timeout: 2000 });
        const finalTitle = await page.title();
        expect(finalTitle).not.toMatch(/⏳/);

        // Verify notification
        await waitForNotification();
    });

    test('Should display hourglass when Claude task starts', async () => {
        await page.goto('https://claude.ai/test');

        const initialTitle = await page.title();
        expect(initialTitle).not.toMatch(/⏳/);

        await page.click('#start-claude'); // Injects button[aria-label="Stop response"]

        await page.waitForFunction(() => document.title.includes('⏳'), { timeout: 2000 });
        const generatingTitle = await page.title();
        expect(generatingTitle).toMatch(/⏳/);

        await page.click('#stop-task');
        await page.waitForFunction(() => !document.title.includes('⏳'), { timeout: 2000 });
        const finalTitle = await page.title();
        expect(finalTitle).not.toMatch(/⏳/);

        // Verify notification
        await waitForNotification();
    });
});
