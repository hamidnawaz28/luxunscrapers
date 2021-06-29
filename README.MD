PUPPETEER
---------
Use this in the code:
```
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors',
            '--disable-dev-shm-usage',
            '--lang=en-US;q=0.9,en',
            '--proxy-server=127.0.0.1:24000'
        ]
    });
```