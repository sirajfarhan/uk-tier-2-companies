const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const delay = require('delay');
const request = require('request-promise').defaults({ proxyAddress: 'luminati:24000' });

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

    while (true) {
        try {
            console.log('TRYING TO CONNECT WITH PROXY');
            await request({
                uri: 'http://lumtest.com/myip.json',
                json: true,
            });
            break;
        } catch (e) {
            console.log('CAUGHT ERROR');
            await delay(5000);
        }
    }

    console.log('EVERYTHING IS READY');

    // const companies = await readDataFromS3(bundleId, 'companies.json');

    for (let i = 0; i < 10; i++) {
        const { ip } = await request({
            uri: 'http://lumtest.com/myip.json',
            json: true,
        });

        console.log('IP', ip);
        await delay(5000);

        // await driver.get(`https://www.indeed.co.uk/companies/search?from=discovery-cmp-front-door&q=${companies[i].organisationName.replace(/ /g, '+')}`);

        // if (i % 50 === 0) {
            // console.log('PROGRESS', i);
            // await writeDataToS3(bundleId,'companies.json', companies);
        // }
    }
    // await writeDataToS3(bundleId,'companies.json', companies);
}

main();
