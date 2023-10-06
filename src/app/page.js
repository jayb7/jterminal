'use client'
import Webby from './websocket.js'
import {Chart} from './charts.js'
import { useEffect,useState } from 'react'


export default function Home() {
  const [symbols, setSymbols] = useState([]);
  const [klineData, setKlineData] = useState([]); // <-- Define new state variable for klineData

  const axios = require('axios');
  

  useEffect(() => {
      const getSymbols = async () => {
          try {
              const response = await axios.get('https://api.bybit.com/v5/market/tickers', { params: { category: 'linear' }}); 
              const symbols = response.data.result.list.map((item) => item.symbol);
              setSymbols(symbols);
          } catch(error) {
              console.log(error);
          }
      }
      
      getSymbols();
  }, []);

    return ( <> <div className="container mx-auto pt-5">
        <div className=''>
            <h1 className="pb-8 font-bold text-2xl text-white">J TERMINAL</h1>
         
        </div>

        <div className="grid grid-cols-5 gap-20">
            
        <div className="chart col-span-3">
          
            <Chart klineData={klineData} x/>
      
        
        </div>
        <div className='col-span-2'>
              <Webby symbols={symbols} onKlineDataChange={setKlineData} />
              </div>
              </div>

        
    </div> < />
  )
}