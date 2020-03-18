const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const delay = require('delay');
const request = require('request-promise');

const { readDataFromS3, writeDataToS3, createS3Bucket } = require('./helpers');
const { extractContactInfo } = require('./helpers/selenium/website');
const { getJobsFromIndeed } = require('./helpers/selenium/indeed');

const { bundleId } = require('./package.json');
const { BUCKET_NAME, INIT, SIZE } = process.env;

const options = new Options()
    .headless()
    .addArguments('--disable-dev-shm-usage')
    .addArguments('--no-sandbox')
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
        if(companies[i].indeedUrl) {
            await driver.get(companies[i].indeedUrl);
            const { jobs } = await getJobsFromIndeed(driver);
            companies[i].jobs = jobs;
            if(typeof companies[i].noOpenings !== 'undefined') {
                delete companies[i].noOpenings;
            }
            if(i % 100 === 0) {
                await writeDataToS3(bundleId,'companies.json', companies);
                console.log('PROGRESS', i);
            }
        }
    }
    await writeDataToS3(bundleId,'companies.json', companies);
}

main();
