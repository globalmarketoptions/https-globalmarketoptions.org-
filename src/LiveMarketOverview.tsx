import { useEffect, useRef } from 'react';

const tickerScript = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
const marketOverviewScript = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';

function mountTradingViewWidget(container: HTMLElement, source: string, config: Record<string, unknown>) {
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
  const link = document.createElement('a');
  link.href = 'https://www.tradingview.com/markets/';
  link.target = '_blank';
  link.rel = 'noopener nofollow';
  link.textContent = 'Market data by TradingView';
  credit.appendChild(link);
  frame.appendChild(credit);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = source;
  script.async = true;
  script.textContent = JSON.stringify(config);
  frame.appendChild(script);
  container.replaceChildren(frame);
}

const overviewTabs = [
  {
    title: 'Crypto',
    symbols: [
      { s: 'BINANCE:BTCUSDT', d: 'Bitcoin / USDT' },
      { s: 'BINANCE:ETHUSDT', d: 'Ethereum / USDT' },
      { s: 'BINANCE:SOLUSDT', d: 'Solana / USDT' },
    ],
    originalTitle: 'Crypto',
  },
  {
    title: 'Stocks',
    symbols: [
      { s: 'NASDAQ:AAPL', d: 'Apple' },
      { s: 'NASDAQ:NVDA', d: 'NVIDIA' },
      { s: 'SP:SPX', d: 'S&P 500' },
    ],
    originalTitle: 'Stocks',
  },
  {
    title: 'Forex',
    symbols: [
      { s: 'OANDA:EURUSD', d: 'EUR / USD' },
      { s: 'OANDA:GBPUSD', d: 'GBP / USD' },
      { s: 'OANDA:USDJPY', d: 'USD / JPY' },
    ],
    originalTitle: 'Forex',
  },
  {
    title: 'Commodities',
    symbols: [
      { s: 'OANDA:XAUUSD', d: 'Gold' },
      { s: 'OANDA:XAGUSD', d: 'Silver' },
      { s: 'TVC:USOIL', d: 'WTI Crude Oil' },
    ],
    originalTitle: 'Commodities',
  },
];

const tickerSymbols = overviewTabs.flatMap(tab =>
  tab.symbols.map(symbol => ({ title: symbol.d, proName: symbol.s }))
);

export function LiveMarketOverview() {
  const ticker = useRef<HTMLDivElement>(null);
  const overview = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker.current || !overview.current) return;

    mountTradingViewWidget(ticker.current, tickerScript, {
      symbols: tickerSymbols,
      colorTheme: 'dark',
      isTransparent: true,
      showSymbolLogo: true,
      displayMode: 'adaptive',
      locale: 'en',
      width: '100%',
      height: 54,
      largeChartUrl: '',
    });

    mountTradingViewWidget(overview.current, marketOverviewScript, {
      colorTheme: 'dark',
      dateRange: '12M',
      locale: 'en',
      largeChartUrl: '',
      isTransparent: true,
      showFloatingTooltip: true,
      plotLineColorGrowing: 'rgba(67, 203, 145, 1)',
      plotLineColorFalling: 'rgba(245, 101, 101, 1)',
      gridLineColor: 'rgba(255, 255, 255, 0.06)',
      scaleFontColor: 'rgba(224, 237, 231, 0.72)',
      belowLineFillColorGrowing: 'rgba(67, 203, 145, 0.12)',
      belowLineFillColorFalling: 'rgba(245, 101, 101, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(67, 203, 145, 0)',
      belowLineFillColorFallingBottom: 'rgba(245, 101, 101, 0)',
      symbolActiveColor: 'rgba(67, 203, 145, 0.16)',
      tabs: overviewTabs,
      width: '100%',
      height: 410,
      showSymbolLogo: true,
      showChart: true,
    });

    return () => {
      ticker.current?.replaceChildren();
      overview.current?.replaceChildren();
    };
  }, []);

  return (
    <div className="hero-live-market" aria-label="Live market overview powered by TradingView">
      <div className="hero-live-ticker" ref={ticker} aria-label="Market quotes and percentage changes" />
      <div className="hero-live-chart" ref={overview} aria-label="Interactive global market charts" />
      <p className="hero-live-note">
        Quotes, price trends and market-session details are provided by TradingView where available. Data cadence varies by instrument and exchange; figures may be delayed and are informational only.
      </p>
    </div>
  );
}
