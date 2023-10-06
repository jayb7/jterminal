import https from 'https';
import crypto from 'crypto'
require('dotenv').config();


let intervalId;

function keepAlive() {
    https.get('https://api.bybit.com/v3', (res) => {
        if (res.statusCode != 200) {
            console.log('Bybit Ping failed with status: ' + res.statusCode);
        }
    }).on('error', (err) => {
        console.log('Bybit Ping Errored', err);
    });
}

function startKeepAlive() {
    //Start the interval
    intervalId = setInterval(keepAlive, 10 * 1000);
    
}

startKeepAlive();


async function createOrder(symbol, side, value, price) {
    console.log("Symbol:", symbol, "Side:", side, "Qty:", value, "Price:", price);
    
    const timestamp = Date.now();
    const api_key = "x";
    const api_secret = "y";

    const data = {
        category: "linear",
        symbol: symbol,
        side: side,
        order_type: "Limit",
        qty: value,
        price: price,
        reduceOnly: false
    };

    const sortedData = Object.keys(data).sort().reduce((result, key) => {
        result[key] = data[key];
        return result;
    }, {});

    const prehash = timestamp + api_key + "5000" + JSON.stringify(sortedData);    
    const signature = crypto.createHmac('sha256', api_secret).update(prehash).digest('hex');

    const options = {
        hostname: 'api.bybit.com',
        path: '/unified/v3/private/order/create',
        method: 'POST',
        headers: {
            "X-BAPI-SIGN": signature,
            "X-BAPI-API-KEY": api_key,
            "X-BAPI-TIMESTAMP": timestamp.toString(),
            "X-BAPI-RECV-WINDOW": "5000",
            "Content-Type": "application/json; charset=utf-8"
        }
    };

    const startTime = performance.now();

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(JSON.parse(data));

            // Mark the end time and calculate duration
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`Order creation took ${duration}ms.`);
        });

    }).on('error', (error) => {
        console.error(error);
    });

    req.write(JSON.stringify(sortedData));
    req.end();
}

export default createOrder;
