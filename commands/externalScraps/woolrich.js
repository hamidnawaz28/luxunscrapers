"use strict";
let common = require("../common");

const puppeteer = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
puppeteer.use(pluginStealth());
const sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
const msleep = 10000; // sleeping time
const sitename = "woolrich";
const WOOLRICH = {
  async firstOne(id, sku, brand) {
    sku = sku.trim();
    let browser = ''
    try {
      // Set up browser and page.
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--ignore-certificate-errors",
          "--disable-dev-shm-usage",
          "--lang=en-US;q=0.9,en",
        ],
      });
      const page = await browser.newPage();
      page.setViewport({
        width: 1400,
        height: 1050,
      });
      await page.goto(
        `https://www.woolrich.com/us/en/search?q=${sku}&lang=en_US`,
        {
          waitUntil: "load",
          timeout: 0,
        }
      );
      let foundItem = await page.evaluate(this.findItemBySku);
      let element = await page.$("div.empty-set");
      if (foundItem && !element) {
        try {
          await page.goto(foundItem);
          await sleep(msleep);
          let product = await page.evaluate(
            this.extractData,
            common.GLOBALCOLORS
          );
          if (product) {
            let productDetails = common.createProduct(
              product.sku,
              product.title,
              product.supplier,
              product.url,
              product.category,
              product.composition,
              product.description,
              product.dimensions,
              product.price,
              product.discounted_price,
              product.images,
              product.sizes,
              product.brand,
              product.color,
              product.country,
              product.is_sale,
              product.size_system,
              product.currency,
              product.b2b_price
            );
            await common.sendToAppServerExternal(
              id,
              productDetails,
              sitename,
              "true"
            );
          }
        } catch (ex) {
          console.log(ex);
          await common.sendToAppServerExternal(id, {}, sitename, "fail");
        }
      } else {
        console.log("Product not found");
        await common.sendToAppServerExternal(
          id,
          { 
            sku, 
            supplier: "Woolrich", 
            brand: brand 
          },
          "Woolrich",
          "fail"
        );
      }
      // await browser.close();
    } catch (err) {
      console.log(err);
    }
    if (browser !== "") {
      await browser.close()
    }
    return "done";
  },
  findItemBySku() {
    let Item = document.querySelector('[data-option-list="SEARCH_RESULT"]');
    if (Item) {
      return Item.getAttribute("href");
    }
    return false;
  },
  extractData(colors) {
    // Set empty data object
    let data = {};
    // Set Brand
    data["brand"] = "woolrich";

    // set URL
    data["url"] = document.URL;

    // Set title
    data["title"] = ''
    const titleObj = document.querySelector('.h3.product-name')
    if (titleObj) data["title"] = titleObj.innerText.trim();
    

    //set dimensions Not Available
    data["dimensions"] = [];


    // Set Size
    data['sizes'] = []
    const sizeObj = document.querySelectorAll('.select-size > button')
    if(sizeObj){
      let sizeArr = Array.from(sizeObj).map(item=>item.innerText)
          data['sizes'] = sizeArr
    }

    // Set category
    data["category"] = [] 
    const catObj = document.querySelectorAll('.breadcrumbs li')
    if (catObj) {
      let catArr = Array.from(catObj).map(item=>item.innerText)
      data["category"] = catArr || "";
    }

  
    // Set Price
    data["discounted_price"] = "0";
    if(document.querySelector('.sales.discounted')){
      data["discounted_price"] = document.querySelectorAll('.sales.discounted > span')[0].innerText.replace('$','');
      data["price"] = document.querySelector('.sales.discounted > span >span').getAttribute('content').replace('$','');
    }
    else data["price"] = document.querySelector('.price > span >  span > span').getAttribute('content').replace('$','');
    

    // Set Product images
    data["images"] = [];
    const imagesObj = document.querySelectorAll(".product-images > div picture img")
    if (imagesObj.length) {
      let imgs = Array.from(imagesObj).map(img=>img.src)
      data["images"] = imgs
    }

    // SKU
    data["sku" ] = ''
    const skuObj = document.querySelector('.product-name > span')
    if (skuObj) {
      data["sku"] = skuObj.innerText
    }

    // Composition
    data["composition"] = ''
    const comObj = document.querySelector('.product-materials span')
    if (comObj) data["composition"] = comObj.innerText
    

    // Color
    data["color"] = ''
    if(document.querySelectorAll('.color-list > ul > li').length>1) data["color"] = 'Multicolor';
    else {
      let colorText = document.querySelector('.selected-color-label > span').innerText
      for (color of colors) {
        let titleUpperCase = colorText.toUpperCase();
        if (titleUpperCase.includes(color.toUpperCase())) {
          data["color"] = color;
          break;
        }
      }
    }
    // Supplier
    data["supplier"] = "woolrich";
    
    // Size System
    data["size_system"] = "Standard";

    // Currency
    data["currency"] = 'EUR'
    const currObj = document.querySelector('small')
    if (currObj) {
        let metaArr = currObj.innerText.split('|')
        let currStr = metaArr[metaArr.length-1]
        var currRegex = /[A-Z]+/i; 
        var currency = currStr.match(currRegex)[0];
        data["currency"] = currency
    }

    // Description
    data['description'] =''
    let desObj = document.querySelectorAll('.product-short-description li')
    if(desObj)
    {
      data['description'] = Array.from(desObj).map(item=>{
        if(!item.innerText.includes('Product Name')){
          return item.innerText
        }
        return ''
      }).join('')
    }
    
    // Country
    data["country"] = 'USA'
  

    // Set B2B price
    data["b2b_price"] = "0";


    return data;
  },
};
module.exports = WOOLRICH;

// WOOLRICH.firstOne('','CFWWSI0083FRUT2589_800_XS', sitename)