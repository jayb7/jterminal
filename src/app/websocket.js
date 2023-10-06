'use strict'
import React, { useEffect, useState, useRef } from 'react';
import bionicConvert from './bionic.js';
import { Chart } from './charts.js';
import axios from 'axios';
import bubbleSound from '/public/sounds/bubble.wav';
import { createOrder } from './ordercreator.js';


const PRICE_HISTORY_WINDOW_MS = 10000; // 10 seconds in milliseconds
const ORDER_USD_VALUES = [1800, 5000, 11000];

export default function Webby({ symbols, onKlineDataChange }) {
  const [wsData, setWsData] = useState([]);
  const [prices, setPrices] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [orderDetails, setOrderDetails] = useState({});
  const [klineData, setKlineData] = useState([]);
  const [playSound, setPlaySound] = useState(false);
  

  const bubbleAudio = new Audio(bubbleSound);

  let priceBuffer = {};

  useEffect(() => {
    const newOrderDetails = {};
    for (let symbol of symbols) {
      newOrderDetails[`${symbol}USDT`] = [];
      for (let usdValue of ORDER_USD_VALUES) {
        newOrderDetails[`${symbol}USDT`].push({
          price: null,
          quantity: null,
          usdValue: usdValue,
        });
      }
    }
    setOrderDetails(newOrderDetails);
  }, [symbols]);

  // Connection to news server using Websocket
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ws1 = new WebSocket('wss://news.treeofalpha.com/ws');

    ws1.addEventListener('open', () => {
      console.log('Connected to Tree WS Server');
    });

    ws1.addEventListener('message', (message) => {
      if (message.data !== 'pong') {
        const data = JSON.parse(message.data);
        setPlaySound(true);
        setWsData((prevState) => {
          return [data, ...prevState];
        });
      }
    });

    ws1.addEventListener('error', (error) => {
      console.log('Error from ws1:', error);
    });
    ws1.addEventListener('close', () => {
      console.log('Connected Ended to Tree WS Server');
    });

    const pingInterval = setInterval(() => {
      if (ws1.readyState === 1) {
        // Check if WebSocket is open before sending 'ping'
        ws1.send('ping');
      } else {
        console.log('ws1.readyState:', ws1.readyState);
      }
    }, 10000);

    return () => {
      clearInterval(pingInterval);
      ws1.close();
    };
  }, []);

  useEffect(() => {
    if (playSound) {
      bubbleAudio.play();
      setPlaySound(false);
    }
  });

  const priceBufferRef = useRef({});

  useEffect(() => {
    if (symbols.length > 0) {
      const ws2 = new WebSocket('wss://stream.bybit.com/v5/public/linear');

      ws2.addEventListener('open', () => {
        console.log('Connected to Bybit WS Server');
        ws2.send(
          JSON.stringify({
            op: 'subscribe',
            args: [
              ...symbols.map((symbol) => `tickers.${symbol}`),
              ...symbols.map((symbol) => `kline.1.${symbol}`),
            ],
          })
        );
      });

      ws2.addEventListener('message', (message) => {
        const data = JSON.parse(message.data);

        if (data.data && typeof data.data.lastPrice !== 'undefined') {
          priceBufferRef.current[data.data.symbol] = data.data.lastPrice;
        }

        const topicArray = data.topic ? data.topic.split('.') : [];
        const symbolFromTopic = topicArray.length > 2 ? topicArray[2] : '';

        if (
          data.topic &&
          data.topic.startsWith('kline.1') &&
          symbolFromTopic === 'BTCUSDT'
        ) {
          const newData = {
            open: parseFloat(data.data[0].open),
            high: parseFloat(data.data[0].high),
            low: parseFloat(data.data[0].low),
            close: parseFloat(data.data[0].close),
            time: data.data[0].start,
          };

          setKlineData((prevState) => {
            let updated = false;
            const nextState = prevState.map((item) => {
              if (item.time === newData.time) {
                updated = true;
                return newData;
              }
              return item;
            });

            if (!updated) {
              nextState.push(newData);
              nextState.sort((a, b) => a.time - b.time);
            }
            // onKlineDataChange(nextState);
            return nextState;
          });
        }
      });

      ws2.addEventListener('error', (error) => {
        console.log('Error from ws2:', error);
      });

      const updateInterval = setInterval(() => {
        const newPrices = { ...priceBufferRef.current };
        let newPriceHistory = { ...priceHistory };

        for (let symbol in newPrices) {
          if (!newPriceHistory[symbol]) {
            newPriceHistory[symbol] = [];
          }
          const price = newPrices[symbol];
          newPriceHistory[symbol] = [
            { timestamp: Date.now(), price },
            ...newPriceHistory[symbol],
          ];
        }

        setPrices(newPrices);
        setPriceHistory(newPriceHistory);
        priceBufferRef.current = {};
      }, PRICE_HISTORY_WINDOW_MS);

      const pingInterval = setInterval(() => {
        if (ws2.readyState === 1) {
          // Check if WebSocket is open before sending 'ping'
          ws2.send('ping');
        }
      }, 10000);

      return () => {
        clearInterval(pingInterval);
        clearInterval(updateInterval);
        ws2.close();
      };
    }
  }, [symbols]);

  const getDecimalPlaces = (price) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return 0; // silently handle non-numeric input
    }
    if (price >= 10) return 3;
    else if (price >= 0.001) return 6;
    else return 8;
  };

  useEffect(() => {
    const newOrderDetails = {};
    for (let symbol in priceHistory) {
      newOrderDetails[symbol] =
        ORDER_USD_VALUES.map((usdValue) => {
          const symbolHistory = priceHistory[symbol] || [];
          if (symbolHistory.length > 0) {
            const price = symbolHistory[0].price;
            const qty = usdValue / price;
            const decimalPlacesQty = getDecimalPlaces(qty);
            const adjustedQty = qty.toFixed(decimalPlacesQty);

            return {
              price: price,
              quantity: adjustedQty,
              usdValue: usdValue,
            };
          }
          return {
            price: null,
            quantity: null,
            usdValue: usdValue,
          };
        }) || [];
    }
    setOrderDetails(newOrderDetails);
  }, [priceHistory]);

  const placeOrder = (symbol, orderType, usdValue) => {
    console.log('Trying to place order:', symbol, orderType, usdValue);

    const orderDetail = orderDetails[`${symbol}USDT`]?.find(
      (detail) => detail.usdValue === usdValue
    );

    if (!orderDetail?.price || !orderDetail?.quantity) {
      console.error(
        `Cannot place order. Price or quantity is null for symbol ${symbol} and USD value ${usdValue}`
      );
      return;
    }
    console.log('Initial price from order details:', orderDetail.price); // <-- Log the initial price

    let price = parseFloat(orderDetail.price);

    if (orderType === 'Buy') {
      price *= 1.04;
    } else if (orderType === 'Sell') {
      price *= 0.96;
    }

    console.log('Adjusted price before formatting:', price); // <-- Log the adjusted price before formatting

    const priceToPlaceOrder = price.toFixed(getDecimalPlaces(price));
    console.log(`Placing order at price: ${priceToPlaceOrder}`);
    createOrder(`${symbol}USDT`, orderType, orderDetail.quantity, priceToPlaceOrder);
  };

  return (
    <>
      {wsData.length > 0 ? (
        wsData.map((item, index) => {
          let [title] = item.title.split(':');
          title = title.replace(/ \(@.*\)$/, '');
          const bodyorEn = item.body || item.en;
          const reLinks = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;

          const links = item.link || item.url;
          const linkBoolean = links && links.includes('twitter.com');
          const linkText = (linkBoolean) => {
            if (linkBoolean) {
              return 'Twitter';
            } else {
              return 'Blog';
            }
          };

          const bodyorEnWithoutLinks = bodyorEn.replace(reLinks, '');
          const finalBody = bionicConvert(bodyorEnWithoutLinks);
          const symbols_orig =
            item.symbols ||
            item.coin ||
            (item.suggestions && item.suggestions[0] && item.suggestions[0].coin) ||
            '';
          const symbols = String(symbols_orig).split('_')[0];
          const timestamp = Number(item.time);
          const date = new Date(timestamp);
          const minutes = date.getMinutes();
          const hours = date.getHours();
          const seconds = date.getSeconds();
          const time = `${hours}:${minutes}:${seconds}`;

          return (
            <div
              key={index}
              className='col-span-2 justify-end'
            >
              <div className="p-6 mx-auto bg-neutral-800 rounded-xl shadow-lg flex flex-col items-stretch mb-5 border-2 border-gray-700">
                <p className='pb-2 font-mono text-pink-300 uppercase font-bold'>{title}</p>
                <p className="pb-5 break-words text-base leading-9 font-normal" dangerouslySetInnerHTML={{ __html: finalBody }}></p>
                <div className='flex justify-between'>
                  {item.link && (
                    <p className="pb-5">
                      <a href={item.link} className='text-sm text-gray-400 underline' target="_blank">{linkText(linkBoolean)}</a>
                    </p>
                  )}
                  <p className='order-last text-sm text-gray-400 pb-5'>{time}</p>
                </div>
                <div className='border-2 border-gray-700 p-5 rounded-lg'>
                  <span className="inline text-sm font-bold text-white-700 pl-3">{symbols}</span>
                  <div className="flex flex-row items-baseline content-center pt-3">
                    <button onClick={() => placeOrder(symbols, "Buy", 1800)} className="rounded-full border-2 border-green-500 bg-green-700 hover:bg-green-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$1.8K</button>
                    <button onClick={() => placeOrder(symbols, "Buy", 5000)} className="rounded-full border-2 border-green-500 bg-green-700 hover:bg-green-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$5K</button>
                    <button onClick={() => placeOrder(symbols, "Buy", 11000)} className="rounded-full border-2 border-green-500 bg-green-700 hover:bg-green-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$11K</button>
                  </div>
                  <div className="flex flex-row items-baseline content-center pt-2">
                    <button onClick={() => placeOrder(symbols, "Sell", 1800)} className="rounded-full border-2 border-red-500 bg-red-700 hover:bg-red-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$1.8K</button>
                    <button onClick={() => placeOrder(symbols, "Sell", 5000)} className="rounded-full border-2 border-red-500 bg-red-700 hover:bg-red-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$5K</button>
                    <button onClick={() => placeOrder(symbols, "Sell", 11000)} className="rounded-full border-2 border-red-500 bg-red-700 hover:bg-red-400 transition delay-250 duration-300 mr-2 py-2 px-9 font-semibold">$11K</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p>Waiting for data...</p>
      )}
    </>
  );
}
