const puppeteer = require("puppeteer-extra")
const constants = require("./constants");
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth())
const sleep = duration => new Promise(resolve => setTimeout(resolve, duration));
const msleep = 10000; // sleeping time
const sitename = 'visiona';
const urls = [
    ['https://www.visiona.it/men-designers/', 'https://www.farfetch.com/designers/men'],
    ['https://www.visiona.it/woman-designers/', 'https://www.farfetch.com/it/designers/women']
];
let common = require("./common");
let day = new Date().getUTCDate();

async function scrapeDesigners(
    page,
    extractDesigners,
    getLinks,
    url
) {
    // Set empty arrays
    let designers = [];
    let designerLinks = [];

    // Load designers
    designers = await page.evaluate(extractDesigners);

    for (i = 0; i < designers.length; i++) {
        // for (i = 0; i < 1; i++) {
        const ourBrand = await common.isOurBrand(designers[i], sitename);
        if (ourBrand) {
            designerLinks.push(designers[i]);
        }
    }
    await page.goto(url[1])
    console.log(" going to ", url[1]);
    sleep(msleep)
    await autoScroll(page)
    sleep(msleep)
    let linksArr = designers = await page.evaluate(getLinks);
    console.log("linksArr length > ", linksArr.length);
    let filteredDesigners = linksArr.filter(nandl => designerLinks.some(name => nandl[0].toLowerCase() == name.toLowerCase()))
    console.log("designers for link == ", filteredDesigners.length);
    return filteredDesigners;
}
async function getLinks() {
    let availableLinks = document.querySelectorAll('[data-test="designer-link"]')
    let linksArr = []
    for (let link of availableLinks) {
        linksArr.push([link.innerText, link.href])
    }
    return linksArr
}
async function extractDesigners() {
    const extractedElements = await document.querySelectorAll('.wpb_wrapper>p');
    const items = [];

    for (let element of extractedElements) {
        items.push(element.innerText);
    }
    return items;
}

async function scrapeDesignerPagesForItems(
    page
) {
    // Set URL
    let url = page.url()
    await autoScroll(page)
    // Get pages
    let pages = await page.evaluate(extractPages);

    let localItems = [];
    try {
        for (i = 1; i <= pages; i++) {
            // for (i = 1; i <= 1; i++) {
            console.log('Fetching', url + '?page=' + i);
            try {
                await page.setDefaultNavigationTimeout(0);
                await page.goto(url + '?page=' + i);
                await sleep(msleep);

            } catch (err) {
                console.log("err ==  ", err);
                await page.screenshot({ path: `${constants.SSPATH}${sitename}-${day}.png`, fullPage: true });
                await common.sendScreenshotToServer(sitename, `${sitename}-${day}.png`)
                continue;
            }
            await autoScroll(page)
            await sleep(msleep);
            localItems = localItems.concat(await page.evaluate(extractItems));
            // break; //FOR DEBUGE
        }
    } catch (e) {
        console.log(e);
        await page.screenshot({ path: `${constants.SSPATH}${sitename}-${day}.png`, fullPage: true });
        await common.sendScreenshotToServer(sitename, `${sitename}-${day}.png`)
    }

    console.log("items for brand == ", localItems.length);
    return localItems;
}

async function extractPages() {
    let pageElements = 0
    try {
        pageElements = document.querySelector('[data-testid=page-number]')
        pageElements = pageElements.innerText
            .split('of ')[1]
    }
    catch { pageElements = 1 }
    return Math.ceil(Number(pageElements));
}
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 50;

            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}
function extractItems() {
    const extractedElements = document.querySelectorAll('[data-testid=productCard]>a');
    const items = [];
    for (let element of extractedElements) {
        items.push(element.href);
    }
    return items;
}

function extractData() {
    // Set empty data object
    var data = {};

    // Set URL
    data['url'] = document.URL;

    data['supplier'] = 'visiona'
    // Set brand
    data['brand'] = document.querySelector('#bannerComponents-Container>span>span>a>span').textContent

    // Get product SKU 
    data['sku'] = document.querySelector('[itemprop="sku"]').content;

    // Get category
    data['category'] = '';
    var categoryArr = [];

    let categories = document.querySelectorAll('[data-tstid=breadcrumb]>li')
    let i = 0;
    for (let category of categories) {
        if (i != 2 && i != 5) {
            categoryArr.push(category.innerText.trim());
        }
        i++;
    }
    categoryArr.splice(0, 1);
    data['category'] = categoryArr;

    try {
        // Get product name
        data['title'] = document.querySelector('#bannerComponents-Container>span>span:nth-child(2)').innerHTML
    } catch {
        data['title'] = '';
    }

    try {
        data['description'] = document.querySelector('[data-tstid=cardInfo-description]').innerText
    } catch {
        data['description'] = '';
    }
    // Get currency
    try {
        data['currency'] = document.querySelector('[property="og:price:currency"]').getAttribute('content')
        let currency = data['currency']
        data['currencySymbol'] = currency == 'USD' ? "$" : "€"
    } catch (err) {
        data['currency'] = 'EUR';
        data['currencySymbol'] = '€'
    }

    // Get (old) price
    try {
        var oldPrice = document.querySelector('[data-tstid=priceInfo-original]').innerText.replace(data['currencySymbol'], '').replace(',', '.')
    } catch (err) {
        console.log(err)
    }

    // Get price
    if (oldPrice == undefined) {
        data['price'] = document.querySelector('[data-tstid=priceInfo-original]').innerText.split(' ')[0].replace(',', '.');
        data['discounted_price'] = 0;
        data['is_sale'] = 0;
    } else {
        data['price'] = oldPrice;
        data['discounted_price'] = document.querySelector('[data-tstid=priceInfo-onsale]')
            .innerText.split(' ')[0]
            .replace(',', '.')
            .replace(data['currencySymbol'], '');
        data['discounted_percentage'] = document.querySelector('[data-tstid="priceInfo-discount"]').innerText.split('%')[0]
        data['is_sale'] = 1;
    }

    // Get made_in
    data['country'] = ''
    let countrySelec = document.querySelector('[data-tstid="madeIn"]')
    if (countrySelec) {
        data['country'] = countrySelec.textContent.replace(/made in/i, '').trim()
    }

    // ---------------------Color left
    try {
        // Set empty color
        data['color'] = document.querySelector('[itemprop="colore"]').content.trim();
    } catch {
        data['color'] = '';
    }


    // Get images
    data['images'] = [];
    try {
        try {
            var images = document.querySelectorAll('[data-test="imagery"]>div>div>picture>source')
            for (i = 0; i < images.length; i++) {
                data['images'].push(images[i].srcset);
            }
        }
        catch {
            var images = document.querySelectorAll('[property="og:image"]')[0].getAttribute('content')
            for (i = 0; i < images.length; i++) {
                data['images'].push(images[i].srcset);
            }
        }
    } catch (err) {
        console.log(err)
    }
    // Set size_system

    // Get size
    data['sizes'] = [];
    try {

        let sizeElement = document.querySelectorAll('div[data-tstid="productOffer"] div[data-tstid="sizesDropdownRow"] span[data-tstid="sizeDescription"]');
        let arr = []
        for (element of sizeElement) {
            arr.push(element.innerText)
        }
        data['sizes'] = arr
    } catch (err) {
        console.log(err)
    }



    let sizeSysSelec = document.querySelector('div[data-tstid="productOffer"] div[data-tstid="sizesDropdownRow"] span[data-tstid="sizeScale"]');
    if (sizeSysSelec) {
        data['size_system'] = sizeSysSelec.textContent.split('/')[0].trim()
    }

    // Set b2b_price
    data['b2b_price'] = '0';

    // Get composition
    data['composition'] = '';
    try {
        data['composition'] = document.querySelector('[data-tstid=theDetails-part2]>div:nth-child(1)>p').innerText;
    } catch (err) {
        console.log(err)
    }

    // Get dimensions
    data['dimensions'] = [];

    // Try to get dimensions from diameter
    let dimensionSelec = document.querySelector('.measurementsTableValue')
    if (dimensionSelec) {
        if (dimensionSelec.parentNode && dimensionSelec.parentNode.parentNode) {
            let allSelec = dimensionSelec.parentNode.parentNode.querySelectorAll('tr')
            if (allSelec.length) {
                for (const dim of allSelec) {

                    data['dimensions'].push(dim.textContent.replace(/[^0-9.]/g, '').trim())
                }
            }

        }
    }

    data['dimensions'] = data['dimensions'].filter(e => e.trim())


    let discPercSelec = document.querySelector('[data-tstid="priceInfo-discount"]')
    if (discPercSelec) {

        data['discounted_percentage'] = discPercSelec.textContent.replace(/[^0-9.]/g, '').trim()
    }


    // Return scraped data
    return data;
}


(async () => {
    let browser = ''
    try {

        // Set up browser and page.
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors',
                '--disable-dev-shm-usage',
                '--lang=en-US;q=0.9,en'
            ]
        });
        const page = await browser.newPage();
        page.setViewport({ width: 1600, height: 1200 });

        let startScrapDetails = await common.endScrapDetails(sitename, Date.now(), "Start Scrap Called");
        await common.startscrap(startScrapDetails)

        // Set empty items
        var designerLinks = [];
        var items = [];

        // Loop over urls
        for (let url of urls) {
            // Output page
            console.log('Fetching', url[0]);

            await page.setDefaultNavigationTimeout(0);
            // Navigate to page
            await page.goto(url[0]);
            await sleep(msleep);

            // Get all deisgner pages
            designerLinks = designerLinks.concat(await scrapeDesigners(page, extractDesigners, getLinks, url));
            // Sleep
            await sleep(msleep);
            // break; // FOR DEBUG
        }

        console.log('Found', designerLinks.length, 'designer pages');

        await common.positionDetail(sitename, constants.Brand)


        // Loop over designer pages
        for (let designerLink of designerLinks) {
            // Output page

            console.log('Fetching', designerLink[1]);

            try {
                // Navigate to page
                await page.setDefaultNavigationTimeout(0);
                await page.goto(designerLink[1]);
                // await sleep(msleep);

            } catch {
                await page.screenshot({ path: `${constants.SSPATH}${sitename}-${day}.png`, fullPage: true });
                await common.sendScreenshotToServer(sitename, `${sitename}-${day}.png`)
                continue;
            }
            await autoScroll(page)


            items = items.concat(await scrapeDesignerPagesForItems(page));

            // Sleep
            await sleep(msleep);

            // break; // FOR DEBUG
        }

        console.log('Found ' + items.length + ' product URLs');

        await common.positionDetail(sitename, constants.Item)

        // Send URL's to ERP and get new product URLs in return
        let newItems = await common.processProductLinks(sitename, items);
        // Output number of new product URLs
        let totalLinks = newItems.length
        console.log('Found ' + totalLinks + ' new product URLs');

        // Loop over new items
        for (i = 0; i < totalLinks; i++) {
            // Output page
            console.log('Fetching', newItems[i]);

            // Navigate to page
            let productData;
            try {
                await page.setDefaultNavigationTimeout(0);
                await page.goto(newItems[i], { waitUntil: "networkidle0" });
                await sleep(msleep);
                // Get product data
                productData = await page.evaluate(extractData);
                // Convert product data to product details

            } catch (err) {
                console.log(err);
                await page.screenshot({ path: `${constants.SSPATH}${sitename}-${day}.png`, fullPage: true });
                await common.sendScreenshotToServer(sitename, `${sitename}-${day}.png`)
                await sleep(msleep);
            }

            try {
                if (productData) {
                    let productDetails = common.createProduct(productData.sku, productData.title, productData.supplier, productData.url, productData.category, productData.composition, productData.description, productData.dimensions, productData.price, productData.discounted_price, productData.images, productData.sizes, productData.brand, productData.color, productData.country, productData.is_sale, productData.size_system, productData.currency, productData.b2b_price, productData.discounted_percentage);

                    // Debug output
                    console.log(productDetails);
                    await common.sendToPhpServer(productDetails);
                }
            } catch (error) {
                console.log("error >> ", error);
            }
        }

        await common.positionDetail(sitename, constants.Product)
        let endScrapDetails = common.endScrapDetails(siteName, Date.now());
        await common.endscrap(endScrapDetails)
    } catch (error) {
        console.log("FINAL ERROR >> ", error);
    }
    if (browser !== '') {
        await browser.close()
    }

})();