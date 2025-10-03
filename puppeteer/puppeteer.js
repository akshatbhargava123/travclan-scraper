import puppeteer from 'puppeteer';
import fs from 'fs';

const browser = await puppeteer.launch({
    // executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    // browserURL: 'http://127.0.0.1:9222',
    
    headless: false
});

// const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'))
// console.log('Loaded cookies:', cookies);

// await browser.setCookie(...cookies);

const page = await browser.newPage();
// await page.goto('https://www.travclan.com/hotels/39707491?traceId=cb13ddb0-cc3e-41dc-a270-d58e2c6d74c8&searchQuery={%22checkIn%22:%222025-10-08%22,%22checkOut%22:%222025-10-09%22,%22occupancies%22:[{%22numOfAdults%22:2,%22childAges%22:[]}],%22nationality%22:%22IN%22,%22locationId%22:{%22name%22:%22Itc%20Maurya,%20A%20Luxury%20Collection%20Hotel,%20New%20Delhi%22,%22label%22:%22Itc%20Maurya,%20A%20Luxury%20Collection%20Hotel,%20New%20Delhi,%20New%20Delhi%20And%20Ncr,%20National%20Capital%20Territory%20Of%20Delhi,%20India%20|%20Hotel%22,%22fullName%22:%22Itc%20Maurya,%20A%20Luxury%20Collection%20Hotel,%20New%20Delhi,%20New%20Delhi%20And%20Ncr,%20National%20Capital%20Territory%20Of%20Delhi,%20India%22,%22type%22:%22Hotel%22},%22markupPrice%22:2000});');
await page.goto('http://google.com')

// setInterval(() => {
//     browser.cookies().then(cookies => {
//       console.log('Cookies:', cookies);
//       fs.writeFileSync('cookies2.json', JSON.stringify(cookies, null, 2));
//       console.log('Cookies saved to cookies.json');
//     //   browser.close();
//     }).catch(error => {
//       console.error('Error fetching cookies:', error);
//     });

// }, 3000)    
