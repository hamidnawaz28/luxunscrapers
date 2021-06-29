const WOOLRICH = require("../commands/externalScraps/woolrich");
const request = require("request");
const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));
const msleep = 10000; // sleeping time
async function getFromPhpServer() {
  console.log("getting sku from scraper-needed-products API \n");
  console.log(
    `--------------------------------   ${new Date().toISOString()}   --------------------------------`
  );
  request.get(
    "https://erp.theluxuryunlimited.com/api/scraper-needed-products",
    async (error, res, body) => {
      if (error) {
        console.log(error);
      } else {
        let obj = JSON.parse(body);
        console.log("\nTotal SKUS == ", obj.length);
        for (let i = 0; i < obj.length; i++) {
          console.log(obj[i]);
          console.log("Now Fetching For #Product == ", i + 1);
          await findData(obj[i].sku, obj[i].id, obj[i].name);
        }
      }
    }
  );
}

function findData(sku, id, brand) {
  return new Promise(async (resolve) => {
    let brandName = brand.toUpperCase();
    console.log("\nbrandName >> ", brandName);
    if (brandName.match(/WOOLRICH/i)) {
      try {
        console.log(`----- ${new Date().toISOString()} ----- `);
        console.log("Getting for WOOLRICH " + sku);
        await WOOLRICH.firstOne(id, sku, brandName);
        await sleep(msleep);
      } catch (err) {
        console.log("Getting Error for WOOLRICH " + sku);
        console.log(err);
      }
    }
    resolve("done");
  });
}
getFromPhpServer();
