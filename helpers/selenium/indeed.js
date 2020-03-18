const timeAgoReverse = require('timeago-reverse');

async function getJobsFromIndeed(driver) {
    let jobs = [];
    try {
        jobs = await driver.executeScript(`
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

        jobs = jobs.map(job => {
            if(job.time) {
                job.time = timeAgoReverse.parse(job.time);
            }
            return job;
        });
    } catch (e) {

    }
    
    return { jobs };
}

module.exports = { getJobsFromIndeed };
