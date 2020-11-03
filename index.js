const axios =  require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://gamefaqs.gamespot.com';

const browserHeaders = {
  'accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
  'cache-control': 'max-age=0',
  'referer': 'https://gamefaqs.gamespot.com/',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36'
}

const slug = (str) => {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  var from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
  var to = 'aaaaeeeeiiiioooouuuunc------';
  for (var i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
};

const writeToFile = (data, filename) =>{
  const promiseCallback = (resolve, reject) => {
    fs.writeFile(filename, data, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(true);
    });
  };

  return new Promise(promiseCallback);
}

const readFromFile  = (filename) => {
  const promiseCallback = (resolve) => {
    fs.readFile(filename, 'utf8', (error, contents) => {
      if (error) {
        resolve(null);
      }
      resolve(contents);
    });
  };
  return new Promise(promiseCallback);
}

const getPage = (path) => {
  const url = `${BASE_URL}${path}`;

  const options = {
    headers: browserHeaders
  }

  return axios.get(url, options).then((response) => response.data).catch(console.error);

}

const getCachedPage = (path) => {
  const filename = `cache/${slug(path)}.html`;

  const promiseCallback = async (resolve, reject) => {

    const cachedHTML = await readFromFile(filename);

    if(!cachedHTML){
      const html = await getPage(path);
      await writeToFile(html, filename);
      resolve(html);
    }

    resolve(cachedHTML);
  }

  return new Promise(promiseCallback);
};

const saveData = (data, path) => {
  const promiseCallback = async (resolve, reject) => {
    if (!data || data.length === 0) return resolve(true);
    const dataToStore = JSON.stringify({data: data}, null, 2);
    const created = await writeToFile(dataToStore, path);
    resolve(true);
  }

  return new Promise(promiseCallback);
}

const getPageItems = (html) => {
  const $ = cheerio.load(html);
  
  const promiseCallback = (resolve, reject) => {
    const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';   
    
    const games = [];
    $(selector).each((i, element) => {
      const a = $('td.rtitle > a', element);
      const title = a.text();
      const href = a.attr('href');
      const id = href.split('/').pop();
      games.push({ id, title, path: href });
    });

    resolve(games);
  }

  return new Promise(promiseCallback);
}

const getAllPages = async (start, finish) => {
  let page = start;
  do {
    const path = `/n64/category/999-all?page=${page}`;
    await getCachedPage(path)
      .then(getPageItems)
      .then((data) => saveData(data, `./db/db-${page}.json`))
      .then(console.log)
      .catch(console.error);
    page++;
  } while (page < finish);
};

getAllPages(0, 10);