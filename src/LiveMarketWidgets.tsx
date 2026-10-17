import { useEffect, useRef } from 'react';

const miniChartScript = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
const tickerScript = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';

function mountEmbed(container: HTMLElement, src: string, config: Record<string, unknown>) {
  const frame = document.createElement('div');
  frame.className = 'tradingview-widget-container';
  frame.style.width = '100%';
  frame.style.height = '100%';

  const widget = document.createElement('div');
  widget.className = 'tradingview-widget-container__widget';
  widget.style.width = '100%';
  widget.style.height = '100%';
  frame.appendChild(widget);

  const credit = document.createElement('div');
  credit.className = 'tradingview-widget-copyright';
  const creditLink = document.createElement('a');
  creditLink.href = 'https://www.tradingview.com/markets/';
  creditLink.target = '_blank';
  creditLink.rel = 'noopener nofollow';
  creditLink.textContent = 'Market data by TradingView';
  credit.appendChild(creditLink);
  frame.appendChild(credit);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = src;
  script.async = true;
  script.textContent = JSON.stringify(config);
  frame.appendChild(script);

  container.replaceChildren(frame);
}

const tickerSymbols = [
  ['Bitcoin', 'BINANCE:BTCUSDT'],
  ['Ethereum', 'BINANCE:ETHUSDT'],
  ['Solana', 'BINANCE:SOLUSDT'],
  ['Apple', 'NASDAQ:AAPL'],
  ['NVIDIA', 'NASDAQ:NVDA'],
  ['S&P 500', 'SP:SPX'],
  ['EUR/USD', 'OANDA:EURUSD'],
  ['GBP/USD', 'OANDA:GBPUSD'],
  ['USD/JPY', 'OANDA:USDJPY'],
  ['Gold', 'OANDA:XAUUSD'],
  ['Silver', 'OANDA:XAGUSD'],
  ['WTI Oil', 'TVC:USOIL'],
];

export function LiveMarketTicker() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    mountEmbed(container.current, tickerScript, {
      symbols: tickerSymbols.map(([title, proName]) => ({ title, proName })),
      colorTheme: 'dark',
      isTransparent: true,
      showSymbolLogo: true,
      displayMode: 'adaptive',
      locale: 'en',
      width: '100%',
      height: 54,
      largeChartUrl: '',
    });
  }, []);

  return (
    <div className="market-strip live-market-strip" aria-label="Market quotes from TradingView">
      <div className="live-market-ticker" ref={container} />
      <span className="live-market-attribution">Data timing varies by exchange and instrument · TradingView</span>
    </div>
  );
}

const assetsByTab: Record<string, Array<{ label: string; symbol: string }>> = {
  Crypto: [
    { label: 'BTC · Bitcoin', symbol: 'BINANCE:BTCUSDT' },
    { label: 'ETH · Ethereum', symbol: 'BINANCE:ETHUSDT' },
    { label: 'SOL · Solana', symbol: 'BINANCE:SOLUSDT' },
  ],
  Stocks: [
    { label: 'AAPL · Apple', symbol: 'NASDAQ:AAPL' },
    { label: 'NVDA · NVIDIA', symbol: 'NASDAQ:NVDA' },
    { label: 'SPX · S&P 500', symbol: 'SP:SPX' },
  ],
  Forex: [
    { label: 'EUR / USD', symbol: 'OANDA:EURUSD' },
    { label: 'GBP / USD', symbol: 'OANDA:GBPUSD' },
    { label: 'USD / JPY', symbol: 'OANDA:USDJPY' },
  ],
  Commodities: [
    { label: 'Gold · XAU/USD', symbol: 'OANDA:XAUUSD' },
    { label: 'Silver · XAG/USD', symbol: 'OANDA:XAGUSD' },
    { label: 'Crude oil · WTI', symbol: 'TVC:USOIL' },
  ],
};

function MiniChart({ symbol, label }: { symbol: string; label: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    mountEmbed(container.current, miniChartScript, {
      symbol,
      width: '100%',
      height: '100%',
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      trendLineColor: 'rgba(82, 168, 255, 1)',
      underLineColor: 'rgba(82, 168, 255, 1)',
      underLineBottomColor: 'rgba(82, 168, 255, 0)',
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      chartOnly: false,
      noTimeScale: true,
    });
    return () => container.current?.replaceChildren();
  }, [symbol]);

  return (
    <div className="live-mini-chart-frame" aria-label={'TradingView mini chart for ' + label}>
      <div className="live-mini-chart" ref={container} />
      <a href={'https://www.tradingview.com/chart/?symbol=' + encodeURIComponent(symbol)} target="_blank" rel="noopener noreferrer">
        View on TradingView
      </a>
    </div>
  );
}

export function LiveMarketGrid({ activeTab }: { activeTab: string }) {
  const assets = assetsByTab[activeTab] || assetsByTab.Crypto;
  return (
    <div className="market-cards live-market-cards">
      {assets.map((asset, index) => (
        <article className="market-card live-market-card" key={asset.symbol}>
          <div className="market-card-top">
            <span>{asset.label}</span>
            <span className="market-symbol">0{index + 1}</span>
          </div>
          <MiniChart symbol={asset.symbol} label={asset.label} />
        </article>
      ))}
    </div>
  );
}
