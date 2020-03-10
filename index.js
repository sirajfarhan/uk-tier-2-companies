const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const delay = require('delay');

const { readDataFromS3, writeDataToS3, createS3Bucket } = require('./helpers');

const { bundleId } = require('./package.json');
const { BUCKET_NAME, INIT, SIZE } = process.env;
const proxyAddress = 'luminati:24000';

const options = new Options()
    .headless()
    .windowSize({
        width: 1024,
        height: 768
    });

async function main() {

    let driver = null;

    while (true) {
        try {
            driver = await new Builder()
                .forBrowser('chrome')
                .usingServer('http://selenium:4444/wd/hub')
                .setChromeOptions(options)
                .build();
            break;
        } catch (e) {
            console.log('ERROR', e);
            await delay(5000);
        }
    }

    const companies = await readDataFromS3(bundleId, 'companies.json');

    for (let i = 0; i < companies.length; i++) {

        await driver.get(`https://www.indeed.co.uk/companies/search?from=discovery-cmp-front-door&q=${companies[i].organisationName.replace(/ /g, '+')}`);

        if (i % 50 === 0) {
            // console.log('PROGRESS', i);
            // await writeDataToS3(bundleId,'companies.json', companies);
        }
    }
    // await writeDataToS3(bundleId,'companies.json', companies);
}

main();
