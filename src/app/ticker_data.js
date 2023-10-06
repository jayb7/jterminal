import { useEffect, useState } from 'react';

const axios = require('axios');

const getSymbols = async () => {
    try {
        const response = await axios.get('https://api.bybit.com/v5/market/tickers', { params: { category: 'linear' }}); 
        return response.data.result.list.map((item) => item.symbol);
    } catch(error) {
        console.log(error);
    }
}

