const { Builder } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
const delay = require('delay');
const request = require('request-promise').defaults({ proxy: 'http://luminati:24000' });

const { readDataFromS3, writeDataToS3, createS3Bucket } = require('./helpers');

const { bundleId } = require('./package.json');
const { BUCKET_NAME, INIT, SIZE } = process.env;
const proxyAddress = 'luminati:24000';

const options = new Options()
    .headless()
    .addArguments(`--proxy-server=http://${proxyAddress}`)
    .windowSize({
        width: 1024,
        height: 768
    });

async function main() {
        while (true) {
            try {
                await request('https://indeed.co.uk');
                break;
            } catch (e) {
                await delay(5000);
            }
        }
        const driver = await new Builder()
            .forBrowser('chrome')
            .usingServer('http://selenium:4444/wd/hub')
            .setChromeOptions(options)
            .build();

        const companies = await readDataFromS3(bundleId, 'companies.json');

        for (let i=0; i<1000; i++) {
            await driver.get(`https://www.indeed.co.uk/companies/search?from=discovery-cmp-front-door&q=${companies[i].organisationName.replace(/ /g,'+')}`);

            const indeedUrl = await driver.executeScript(`
               const link = document.querySelector('.cmp-company-tile-blue-name > a');
               return link ? link.href : link;
            `);
            if(!indeedUrl) continue;

            companies[i].indeedUrl = indeedUrl;

            await driver.get(indeedUrl + '/jobs');
            const noOpenings = await driver.executeScript(`
                return document.body.innerText.includes('There are currently no open jobs')
            `);
            const jobs = await driver.executeScript(`
                const jobListSection = document.querySelector('.cmp-JobList-jobList');
                let jobs = []
                if(jobListSection) {
                    const jobList = [...jobListSection.querySelectorAll('li')];
                    jobs = jobList.map(job => {
                        const id = job.dataset.tnEntityid.split(',')[1]
                        const title = job.querySelector('.cmp-JobListItem-title').textContent
                        const city =  job.querySelector('.cmp-JobListItem-subtitle').textContent
                        const time = job.querySelector('.cmp-JobListItem-timeTag').textContent
                        return { id, title, city, time };
                    })
                }
                return jobs
            `);
            companies[i] = { ...companies[i], noOpenings, jobs };

            console.log('PROGRESS', i);

            if(i % 50 === 0) {
                await writeDataToS3(bundleId,'companies.json', companies);
            }
        }
         await writeDataToS3(bundleId,'companies.json', companies);
}

main();
