const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const delay = require('delay');
const request = require('request-promise');

const { readDataFromS3, writeDataToS3, createS3Bucket } = require('./helpers');
const { extractContactInfo } = require('./helpers/selenium/website');

const { bundleId } = require('./package.json');
const { BUCKET_NAME, INIT, SIZE } = process.env;

const options = new Options()
    .headless()
    .windowSize({
        width: 1024,
        height: 768
    });

async function main() {
    while (true) {
        try {
            console.log('TRYING TO CONNECT WITH SELENIUM');
            const { value: { ready } } = await request({
                uri: 'http://selenium:4444/wd/hub/status',
                json: true,
            });
            console.log('READY', ready);
            if(ready) break;
        } catch (e) {
            console.log('CAUGHT ERROR');
        }
        await delay(5000);
    }

    const driver = await new Builder()
        .forBrowser('chrome')
        .usingServer('http://selenium:4444/wd/hub')
        .setChromeOptions(options)
        .build();

    const companies = await readDataFromS3(bundleId, 'companies.json');

    for (let i = 0; i < companies.length; i++) {
        const jobs = companies[i].jobs;
        if (jobs && jobs.length > 0) {
            const website = companies[i].website;
            if(website) {
                await driver.get(website);
                const contactInfo = await extractContactInfo(driver);
                companies[i] = {...companies[i], ...contactInfo};
            }
        }
        if(i % 100 === 0) {
            console.log('PROGRESS', i);
            await writeDataToS3(bundleId, 'companies.json', companies);
        }
    }
    await writeDataToS3(bundleId,'companies.json', companies);
}

main();
