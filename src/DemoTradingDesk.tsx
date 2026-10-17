import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Bell, ShieldAlert, TrendingDown, TrendingUp, Wallet, X } from 'lucide-react';
import type { DemoProfile } from './SimulatedPortal';
type AccountPanelComponent = ComponentType<{ user: User; authReady: boolean; onSignIn: () => void }>;

type User = { email?: string; name?: string } | null;
type Side = 'BUY' | 'SELL';
type OrderType = 'Market' | 'Limit';
type Position = {
  id: string;
  symbol: string;
  side: Side;
  margin: number;
  leverage: number;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: number;
};
type LimitOrder = {
  id: string;
  symbol: string;
  side: Side;
  margin: number;
  leverage: number;
  limitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: number;
};
type DemoTransaction = {
  id: string;
  kind: 'Deposit' | 'Withdrawal';
  amount: number;
  method: string;
  destinationLabel: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled';
  createdAt: number;
};
type ClosedTrade = { id: string; symbol: string; side: Side; pnl: number; closedAt: number };
type Ledger = {
  available: number;
  realized: number;
  positions: Position[];
  orders: LimitOrder[];
  transactions: DemoTransaction[];
  history: ClosedTrade[];
};
type Props = {
  user: User;
  profile: DemoProfile | null;
  authReady: boolean;
  initialSection: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onHome: () => void;
  Chart: ComponentType<{ symbol: string; timeframe: string }>;
  AccountPanel: AccountPanelComponent;
};

const storageKey = (email: string) => {
  let hash = 2166136261;
  for (const character of email.toLowerCase()) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return 'gmo-paper-ledger:' + (hash >>> 0).toString(36);
};
const newLedger = (): Ledger => ({ available: 10000, realized: 0, positions: [], orders: [], transactions: [], history: [] });
const bases: Record<string, number> = {
  'NASDAQ:AAPL': 225,
  'BITSTAMP:BTCUSD': 68000,
  'COINBASE:ETHUSD': 3500,
  'FX:EURUSD': 1.08,
  'OANDA:XAUUSD': 2350,
  'SP:SPX': 5400,
};
const stableHash = (text: string) => [...text].reduce((value, character) => value + character.charCodeAt(0), 0);
const demoMark = (symbol: string, tick: number) => {
  const base = bases[symbol] || 100;
  const phase = stableHash(symbol) / 13;
  return base * (1 + Math.sin(tick / 5 + phase) * 0.002 + Math.sin(tick / 11 + phase / 2) * 0.001);
};
const leverageValue = (value: string) => Number(value.split(':')[1] || 1);
const money = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function DemoTradingDesk({ user, profile, authReady, initialSection, onSignIn, onSignOut, onHome, Chart, AccountPanel }: Props) {
  const accountEmail = user?.email || profile?.email || 'guest-demo';
  const key = storageKey(accountEmail);
  const [section, setSection] = useState(initialSection || 'trading');
  const [symbol, setSymbol] = useState('NASDAQ:AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [orderType, setOrderType] = useState<OrderType>('Market');
  const [amount, setAmount] = useState('250');
  const [leverage, setLeverage] = useState('1:1');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [tick, setTick] = useState(0);
  const [ledger, setLedger] = useState<Ledger>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return newLedger();
      const value = JSON.parse(saved) as Partial<Ledger>;
      return { ...newLedger(), ...value };
    } catch {
      return newLedger();
    }
  });
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundMethod, setFundMethod] = useState('Demo crypto request');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [demoControls, setDemoControls] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(ledger)); } catch { /* demo storage may be unavailable */ }
  }, [key, ledger]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(value => value + 1), 1800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLedger(current => {
      const triggered = current.positions.filter(position => {
        const mark = demoMark(position.symbol, tick);
        return (position.stopLoss !== null && (position.side === 'BUY' ? mark <= position.stopLoss : mark >= position.stopLoss))
          || (position.takeProfit !== null && (position.side === 'BUY' ? mark >= position.takeProfit : mark <= position.takeProfit));
      });
      if (!triggered.length) return current;
      const ids = new Set(triggered.map(position => position.id));
      let returned = 0;
      let realizedDelta = 0;
      const history = triggered.map(position => {
        const exit = demoMark(position.symbol, tick);
        const units = position.margin * position.leverage / position.entry;
        const pnl = (position.side === 'BUY' ? exit - position.entry : position.entry - exit) * units;
        returned += position.margin + pnl;
        realizedDelta += pnl;
        return { id: position.id, symbol: position.symbol, side: position.side, pnl, closedAt: Date.now() };
      });
      return {
        ...current,
        available: Math.max(0, current.available + returned),
        realized: current.realized + realizedDelta,
        positions: current.positions.filter(position => !ids.has(position.id)),
        history: [...history, ...current.history].slice(0, 30),
      };
    });
  }, [tick]);

  const mark = demoMark(symbol, tick);
  const positions = useMemo(() => ledger.positions.map(position => {
    const currentMark = demoMark(position.symbol, tick);
    const units = position.margin * position.leverage / position.entry;
    const pnl = (position.side === 'BUY' ? currentMark - position.entry : position.entry - currentMark) * units;
    return { ...position, mark: currentMark, pnl, units };
  }), [ledger.positions, tick]);
  const marginUsed = ledger.positions.reduce((total, position) => total + position.margin, 0);
  const unrealized = positions.reduce((total, position) => total + position.pnl, 0);
  const equity = ledger.available + marginUsed + unrealized;
  const name = profile?.name || user?.name || user?.email?.split('@')[0] || 'Demo Trader';

  const inform = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3600);
  };
  const savePosition = (side: Side, entry: number, size: number, leverageNumber: number, stop: number | null, target: number | null) => {
    const position: Position = {
      id: 'SIM-' + stamp(), symbol, side, margin: size, leverage: leverageNumber,
      entry, stopLoss: stop, takeProfit: target, openedAt: Date.now(),
    };
    setLedger(current => ({ ...current, available: current.available - size, positions: [position, ...current.positions] }));
    inform(side + ' paper position opened. No order was sent to a broker or exchange.');
  };
  const placeOrder = (side: Side) => {
    const size = Number(amount);
    const leverageNumber = leverageValue(leverage);
    const stop = stopLoss ? Number(stopLoss) : null;
    const target = takeProfit ? Number(takeProfit) : null;
    if (!Number.isFinite(size) || size <= 0) return inform('Enter a demo margin amount above zero.');
    if (size > ledger.available) return inform('This order exceeds the available demo balance.');
    if ((stopLoss && (!Number.isFinite(stop) || Number(stop) <= 0)) || (takeProfit && (!Number.isFinite(target) || Number(target) <= 0))) return inform('Stop-loss and take-profit values must be positive prices.');
    if (stop !== null && (side === 'BUY' ? stop >= mark : stop <= mark)) return inform('Set the stop-loss on the risk side of the current simulated mark.');
    if (target !== null && (side === 'BUY' ? target <= mark : target >= mark)) return inform('Set take-profit beyond the current simulated mark.');
    if (orderType === 'Limit') {
      const limit = Number(limitPrice);
      if (!Number.isFinite(limit) || limit <= 0) return inform('Enter a valid limit price.');
      const order: LimitOrder = { id: 'LIM-' + stamp(), symbol, side, margin: size, leverage: leverageNumber, limitPrice: limit, stopLoss: stop, takeProfit: target, createdAt: Date.now() };
      setLedger(current => ({ ...current, orders: [order, ...current.orders] }));
      inform('Limit order added to the simulated open-orders list.');
      return;
    }
    savePosition(side, mark, size, leverageNumber, stop, target);
  };
  const fillLimit = (order: LimitOrder) => {
    if (order.margin > ledger.available) return inform('Insufficient available demo balance to fill this order.');
    const position: Position = {
      id: 'SIM-' + stamp(), symbol: order.symbol, side: order.side, margin: order.margin,
      leverage: order.leverage, entry: order.limitPrice, stopLoss: order.stopLoss,
      takeProfit: order.takeProfit, openedAt: Date.now(),
    };
    setLedger(current => ({
      ...current,
      available: current.available - order.margin,
      orders: current.orders.filter(item => item.id !== order.id),
      positions: [position, ...current.positions],
    }));
    inform('Limit order filled at its entered demo price. No external order was placed.');
  };
  const requestFunds = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(fundAmount);
    if (!Number.isFinite(value) || value <= 0) return inform('Enter a positive demo amount.');
    if (modal === 'withdraw' && value > ledger.available) return inform('Withdrawal request exceeds available demo balance.');
    const tx: DemoTransaction = {
      id: 'TX-' + stamp(), kind: modal === 'deposit' ? 'Deposit' : 'Withdrawal', amount: value,
      method: fundMethod, destinationLabel: modal === 'withdraw' ? destinationLabel.trim() : '',
      status: 'Pending', createdAt: Date.now(),
    };
    setLedger(current => ({
      ...current,
      available: modal === 'withdraw' ? current.available - value : current.available,
      transactions: [tx, ...current.transactions],
    }));
    setFundAmount('');
    setDestinationLabel('');
    setModal(null);
    inform((tx.kind === 'Deposit' ? 'Demo deposit' : 'Demo withdrawal') + ' request recorded as pending. No money moved.');
  };
  const updateTransaction = (transaction: DemoTransaction, action: 'approve' | 'complete' | 'cancel') => {
    if (action === 'approve' && transaction.kind === 'Deposit' && transaction.status === 'Pending') {
      setLedger(current => ({
        ...current,
        available: current.available + transaction.amount,
        transactions: current.transactions.map(item => item.id === transaction.id ? { ...item, status: 'Approved' } : item),
      }));
    } else if (action === 'approve' && transaction.kind === 'Withdrawal' && transaction.status === 'Pending') {
      setLedger(current => ({ ...current, transactions: current.transactions.map(item => item.id === transaction.id ? { ...item, status: 'Approved' } : item) }));
    } else if (action === 'complete' && transaction.status === 'Approved') {
      setLedger(current => ({ ...current, transactions: current.transactions.map(item => item.id === transaction.id ? { ...item, status: 'Completed' } : item) }));
    } else if (action === 'cancel' && transaction.status === 'Pending') {
      setLedger(current => ({
        ...current,
        available: transaction.kind === 'Withdrawal' ? current.available + transaction.amount : current.available,
        transactions: current.transactions.map(item => item.id === transaction.id ? { ...item, status: 'Cancelled' } : item),
      }));
    }
  };
  const resetLedger = () => {
    setLedger(newLedger());
    inform('Paper ledger reset to the $10,000 demo starting balance.');
  };
  const format = (value: number) => money(value, currency);
  const transactionRows = [...ledger.transactions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section className='portal-shell demo-dashboard trading-desk'>
      <div className='dashboard-topbar'>
        <button className='dashboard-icon-button' type='button' aria-label='Back to home' onClick={onHome}>←</button>
        <a className='dashboard-brand' href='#/'><span className='brand-mark'><span></span><span></span><span></span></span><b>GLOBAL MARKET<small>OPTIONS COMPANY</small></b></a>
        <button className='dashboard-icon-button' type='button' aria-label='Notifications' onClick={() => inform('Notifications in this preview are simulated only.')}><Bell size={18}/></button>
        <button className='dashboard-avatar' type='button' aria-label='Open account settings' onClick={() => setSection('settings')}>{name.slice(0, 1).toUpperCase()}</button>
      </div>
      {notice && <div className='demo-toast' role='status'>{notice}</div>}
      <div className='desk-welcome'>
        <div><div className='eyebrow'><span className='eyebrow-line'/> SIMULATED PAPER ACCOUNT</div><h1>Welcome, {name}</h1><p>This is a browser demo. Paper balances and trades have no cash value and are not sent to an exchange.</p></div>
        <label className='dashboard-currency'>Display currency<select value={currency} onChange={event => setCurrency(event.target.value)}>{['USD','EUR','GBP','AUD','CAD','PHP','CHF','NGN','JPY','SGD','ZAR'].map(code => <option key={code}>{code}</option>)}</select><small>Demo figures are relabelled, not converted.</small></label>
      </div>
      <div className='desk-warning' role='note'><ShieldAlert size={18}/><span><b>DEMO MODE</b> · Starting balance: 10,000 USD. All actions below are simulated in this browser. No deposits, withdrawals, bank transfers, crypto transfers, or real trades occur.</span></div>
      <div className='desk-stat-grid'>
        <article><span>Total Balance / Equity</span><b>{format(equity)}</b><small>Available + open margin + demo P/L</small></article>
        <article><span>Available Balance</span><b>{format(ledger.available)}</b><small>Unreserved simulated funds</small></article>
        <article><span>Realized P/L</span><b className={ledger.realized >= 0 ? 'pnl-positive' : 'pnl-negative'}>{format(ledger.realized)}</b><small>Closed paper positions</small></article>
        <article><span>Unrealized P/L</span><b className={unrealized >= 0 ? 'pnl-positive' : 'pnl-negative'}>{format(unrealized)}</b><small>Using simulated mark prices</small></article>
      </div>
      <nav className='portal-tabs demo-dashboard-tabs' aria-label='Account sections'>
        {['overview','account','trading','funds','history','settings'].map((tab) => <button key={tab} type='button' className={section === tab ? 'active' : ''} onClick={() => setSection(tab)}>{tab === 'overview' ? 'Overview' : tab === 'account' ? 'Wallet & account' : tab === 'trading' ? 'Trading desk' : tab === 'funds' ? 'Deposit & withdraw' : tab === 'history' ? 'Transaction history' : 'Account'}</button>)}
      </nav>

      {section === 'account' && <AccountPanel user={user} authReady={authReady} onSignIn={onSignIn} />}
      {section === 'overview' && <>
        <div className='portal-columns desk-overview-columns'>
          <section className='portal-card'>
            <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>PAPER ACCOUNT</span><h2>Account overview</h2></div><span className='demo-pill'>SIMULATED</span></div>
            <p>Explore the trading interface with a virtual balance. No real funds or orders are involved.</p>
            <div className='desk-overview-actions'>
              <button className='desk-primary' type='button' onClick={() => setSection('trading')}>Open trading desk <TrendingUp size={15}/></button>
              <button className='desk-primary' type='button' onClick={() => { setSection('funds'); setModal('deposit'); setFundMethod('Demo crypto request'); }}>Deposit demo funds <ArrowDownRight size={15}/></button>
              <button className='desk-primary secondary-tone' type='button' onClick={() => { setSection('funds'); setModal('withdraw'); setFundMethod('Demo crypto payout'); }}>Request demo withdrawal <ArrowUpRight size={15}/></button>
            </div>
          </section>
          <section className='portal-card'>
            <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>ACCOUNT ACTIVITY</span><h2>Recent requests</h2></div><button className='desk-small-button' type='button' onClick={() => setSection('history')}>View history</button></div>
            {transactionRows.slice(0, 3).length ? transactionRows.slice(0, 3).map(row => <div className='desk-overview-row' key={row.id}><span>{row.kind}<small>{new Date(row.createdAt).toLocaleString()}</small></span><b>{format(row.amount)}</b><span className={'desk-status-tag status-' + row.status.toLowerCase()}>{row.status}</span></div>) : <p>No demo requests yet. Deposit and withdrawal actions create simulated ledger records only.</p>}
          </section>
        </div>
        <section className='portal-card desk-log-card'>
          <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>OPEN PAPER POSITIONS</span><h2>Positions snapshot</h2></div><button className='desk-small-button' type='button' onClick={() => setSection('trading')}>Manage positions</button></div>
          <div className='table-scroll'><table className='portal-table'><thead><tr><th>Instrument</th><th>Side</th><th>Demo mark</th><th>Unrealized P/L</th></tr></thead><tbody>{positions.slice(0, 4).map(position => <tr key={position.id}><td>{position.symbol}</td><td>{position.side}</td><td>{position.mark.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td><td className={position.pnl >= 0 ? 'trade-buy-text' : 'trade-sell-text'}>{format(position.pnl)}</td></tr>)}{!positions.length && <tr><td colSpan={4}>No open paper positions.</td></tr>}</tbody></table></div>
        </section>
      </>}
      {section === 'trading' && <>
        <div className='desk-trade-layout'>
          <section className='portal-card desk-chart-card'>
            <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>TRADINGVIEW · THIRD-PARTY DATA</span><h2>Market chart</h2></div><span className='demo-pill'>DATA AVAILABILITY VARIES</span></div>
            <label className='portal-field'>Chart instrument<select value={symbol} onChange={event => setSymbol(event.target.value)}>{[['NASDAQ:AAPL','Apple · NASDAQ'],['BITSTAMP:BTCUSD','Bitcoin · USD'],['COINBASE:ETHUSD','Ethereum · USD'],['FX:EURUSD','EUR / USD'],['OANDA:XAUUSD','Gold · USD'],['SP:SPX','S&P 500']].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <div className='timeframe-row' role='group' aria-label='Chart timeframe'>{['1D','1M','3M','1Y','5Y','All'].map(period => <button type='button' aria-pressed={timeframe === period} className={timeframe === period ? 'active' : ''} onClick={() => setTimeframe(period)} key={period}>{period}</button>)}</div>
            <Chart symbol={symbol} timeframe={timeframe}/>
            <p className='portal-note'>TradingView chart quotes may be real-time, delayed, or unavailable depending on the instrument and TradingView access. The demo mark below is independent and is not synchronized with this chart.</p>
          </section>

          <section className='portal-card desk-order-card'>
            <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>PAPER ORDER</span><h2>Place a simulated trade</h2></div><span className='demo-pill'>NO BROKER</span></div>
            <div className='desk-side-toggle' role='group' aria-label='Order direction'><button type='button' className='desk-buy' onClick={() => placeOrder('BUY')}><TrendingUp size={16}/> BUY</button><button type='button' className='desk-sell' onClick={() => placeOrder('SELL')}><TrendingDown size={16}/> SELL</button></div>
            <label className='portal-field'>Order type<select value={orderType} onChange={event => setOrderType(event.target.value as OrderType)}><option>Market</option><option>Limit</option></select></label>
            <div className='desk-current-mark'><span>Simulated mark · {symbol.split(':').pop()}</span><b>{mark.toLocaleString(undefined, { maximumFractionDigits: 5 })}</b><small>Not a TradingView quote</small></div>
            <label className='portal-field'>Margin amount ({currency})<input type='number' min='1' step='0.01' value={amount} onChange={event => setAmount(event.target.value)} /></label>
            {orderType === 'Limit' && <label className='portal-field'>Limit price<input type='number' min='0.00001' step='any' value={limitPrice} onChange={event => setLimitPrice(event.target.value)} placeholder={mark.toFixed(2)} /></label>}
            <label className='portal-field'>Leverage<select value={leverage} onChange={event => setLeverage(event.target.value)}>{['1:1','2:1','5:1','10:1'].map(item => <option key={item}>{item}</option>)}</select></label>
            <div className='demo-form-row'><label className='portal-field'>Stop-loss price<input type='number' min='0.00001' step='any' value={stopLoss} onChange={event => setStopLoss(event.target.value)} placeholder='Optional' /></label><label className='portal-field'>Take-profit price<input type='number' min='0.00001' step='any' value={takeProfit} onChange={event => setTakeProfit(event.target.value)} placeholder='Optional' /></label></div>
            <div className='desk-order-buttons'><button type='button' className='desk-buy' onClick={() => placeOrder('BUY')}>Buy / open long</button><button type='button' className='desk-sell' onClick={() => placeOrder('SELL')}>Sell / open short</button></div>
            <p className='portal-note'>P/L is educational only. No real order, execution price, or investment advice is provided.</p>
          </section>
        </div>

        <section className='portal-card desk-log-card'>
          <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>SIMULATED LEDGER</span><h2>Positions & open orders</h2></div><span className='demo-pill'>{positions.length} OPEN · {ledger.orders.length} LIMIT</span></div>
          <div className='table-scroll'><table className='portal-table'><thead><tr><th>Instrument</th><th>Side</th><th>Entry / limit</th><th>Demo mark</th><th>Margin</th><th>Leverage</th><th>Unrealized P/L</th><th>Action</th></tr></thead><tbody>
            {positions.map(position => <tr key={position.id}><td>{position.symbol}</td><td className={position.side === 'BUY' ? 'trade-buy-text' : 'trade-sell-text'}>{position.side}</td><td>{position.entry.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td><td>{position.mark.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td><td>{format(position.margin)}</td><td>{position.leverage}:1</td><td className={position.pnl >= 0 ? 'trade-buy-text' : 'trade-sell-text'}>{format(position.pnl)}</td><td><button type='button' className='desk-small-button' onClick={() => {
              const realizedPnl = position.pnl;
              setLedger(current => ({ ...current, available: current.available + position.margin + realizedPnl, realized: current.realized + realizedPnl, positions: current.positions.filter(item => item.id !== position.id), history: [{ id: position.id, symbol: position.symbol, side: position.side, pnl: realizedPnl, closedAt: Date.now() }, ...current.history].slice(0, 30) }));
            }}>Close</button></td></tr>)}
            {ledger.orders.map(order => <tr key={order.id}><td>{order.symbol}</td><td>{order.side} · LIMIT</td><td>{order.limitPrice}</td><td>{demoMark(order.symbol, tick).toLocaleString(undefined, { maximumFractionDigits: 5 })}</td><td>{format(order.margin)}</td><td>{order.leverage}:1</td><td>—</td><td><div className='desk-row-actions'><button type='button' className='desk-small-button' onClick={() => fillLimit(order)}>Fill</button><button type='button' className='desk-small-button muted' onClick={() => setLedger(current => ({ ...current, orders: current.orders.filter(item => item.id !== order.id) }))}>Cancel</button></div></td></tr>)}
            {!positions.length && !ledger.orders.length && <tr><td colSpan={8}>No open paper positions or limit orders.</td></tr>}
          </tbody></table></div>
          <p className='portal-note'>P/L marks move on a synthetic demo timer and are not sourced from the embedded chart. Stop-loss and take-profit levels close positions when the simulated mark crosses them.</p>
        </section>
      </>}

      {section === 'funds' && <>
        <div className='desk-funds-grid'>
          <section className='portal-card'><Wallet/><h2>Deposit request</h2><p>Request a simulated ledger credit for testing. No wallet address, QR code, bank details, or real funds are accepted.</p><button className='desk-primary' onClick={() => { setModal('deposit'); setFundMethod('Demo crypto request'); }}>Create demo deposit request <ArrowDownRight size={15}/></button></section>
          <section className='portal-card'><ArrowUpRight/><h2>Withdrawal request</h2><p>Test the balance and approval workflow using a demo payout label. Do not enter real wallet or bank account information.</p><button className='desk-primary secondary-tone' onClick={() => { setModal('withdraw'); setFundMethod('Demo crypto payout'); }}>Create demo withdrawal request</button></section>
        </div>
        <section className='portal-card desk-admin-card'><div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>LOCAL PREVIEW ONLY</span><h2>Demo control mode</h2></div><button type='button' className='desk-small-button' onClick={() => setDemoControls(value => !value)}>{demoControls ? 'Disable controls' : 'Enable demo controls'}</button></div><p>These controls simulate request review in this browser. They are not an admin panel and cannot approve real payments.</p>
          {demoControls && <div className='desk-transactions-list'>{transactionRows.filter(item => item.status !== 'Completed' && item.status !== 'Cancelled').map(transaction => <div className='desk-transaction-row' key={transaction.id}><span><b>{transaction.kind}</b> · {format(transaction.amount)} · {transaction.method}<small>{transaction.status} · {new Date(transaction.createdAt).toLocaleString()}</small></span><div>{transaction.status === 'Pending' && <><button type='button' onClick={() => updateTransaction(transaction, 'approve')}>Approve demo</button><button type='button' className='muted' onClick={() => updateTransaction(transaction, 'cancel')}>Cancel</button></>}{transaction.status === 'Approved' && <button type='button' onClick={() => updateTransaction(transaction, 'complete')}>Mark completed</button>}</div></div>)}</div>}
        </section>
        <TransactionTable rows={transactionRows} currency={currency} format={format}/>
      </>}

      {section === 'history' && <><TransactionTable rows={transactionRows} currency={currency} format={format}/><section className='portal-card desk-log-card'><div className='dashboard-section-heading'><h2>Closed paper trades</h2><span className='demo-pill'>SIMULATED</span></div><div className='table-scroll'><table className='portal-table'><thead><tr><th>Instrument</th><th>Side</th><th>Realized P/L</th><th>Closed</th></tr></thead><tbody>{ledger.history.map(item => <tr key={item.id}><td>{item.symbol}</td><td>{item.side}</td><td>{format(item.pnl)}</td><td>{new Date(item.closedAt).toLocaleString()}</td></tr>)}{!ledger.history.length && <tr><td colSpan={4}>No closed paper positions yet.</td></tr>}</tbody></table></div></section></>}

      {section === 'settings' && <div className='desk-funds-grid'><section className='portal-card'><h2>Demo account</h2><p>{name}</p><p>{user?.email || profile?.email || 'Guest demo account'}</p><p>{profile?.country || 'Country not provided'} · {currency}</p><p className='portal-note'>The practice trading ledger is stored locally in this browser. The separate Client wallet tab stores only the non-cash demo account record on the application server.</p>{user ? <button className='secondary' onClick={onSignOut}>Sign out</button> : <button className='secondary' onClick={onSignIn}>{authReady ? 'Secure email-link sign in' : 'Checking sign-in…'}</button>}</section><section className='portal-card'><h2>Reset demo data</h2><p>Reset this browser's paper account to the starting balance. This clears simulated positions, requests, and history.</p><button type='button' className='desk-small-button danger' onClick={resetLedger}>Reset demo ledger</button></section><section className='portal-card'><h2>Risk note</h2><p>Simulated prices, fills, account figures and transaction statuses are for interface testing only. They do not reflect market quotes or funds.</p><a href='#/risk'>Read risk disclosure</a></section></div>}

      <div className='desk-bottom-spacer'/>
      <div className='desk-status-bar'><span><i className='status-active'/>Paper demo active</span><span>Equity <b>{format(equity)}</b></span><span>Available <b>{format(ledger.available)}</b></span><button type='button' onClick={() => setSection('funds')}>Funds</button></div>

      {modal && <div className='desk-modal-backdrop' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}>
        <section className='desk-modal' role='dialog' aria-modal='true' aria-labelledby='fund-modal-title'>
          <div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>SIMULATED LEDGER REQUEST</span><h2 id='fund-modal-title'>{modal === 'deposit' ? 'Deposit demo funds' : 'Request a demo withdrawal'}</h2></div><button className='dashboard-icon-button' type='button' aria-label='Close modal' onClick={() => setModal(null)}><X size={18}/></button></div>
          <p className='desk-modal-warning'>Demo only. This form does not accept, transmit, or move actual money. Never enter real banking credentials, card data, wallet addresses, private keys, or recovery phrases.</p>
          <form onSubmit={requestFunds}>
            <label className='portal-field'>Request amount ({currency})<input autoFocus type='number' min='0.01' step='0.01' max={modal === 'withdraw' ? ledger.available : undefined} value={fundAmount} onChange={event => setFundAmount(event.target.value)} required/></label>
            <label className='portal-field'>Demo method<select value={fundMethod} onChange={event => setFundMethod(event.target.value)}>{(modal === 'deposit' ? ['Demo crypto request','Demo bank transfer request'] : ['Demo crypto payout','Demo bank payout']).map(option => <option key={option}>{option}</option>)}</select></label>
            {modal === 'withdraw' && <label className='portal-field'>Optional demo destination label<input value={destinationLabel} onChange={event => setDestinationLabel(event.target.value)} maxLength={60} placeholder='Example: test wallet label — no address'/></label>}
            <div className='desk-modal-balance'>Available demo balance <b>{format(ledger.available)}</b></div>
            <div className='desk-modal-actions'><button type='button' className='desk-small-button muted' onClick={() => setModal(null)}>Cancel</button><button className='desk-primary' type='submit'>{modal === 'deposit' ? 'Submit pending demo request' : 'Submit withdrawal request'}</button></div>
          </form>
        </section>
      </div>}
    </section>
  );
}

function TransactionTable({ rows, currency, format }: { rows: DemoTransaction[]; currency: string; format: (value: number) => string }) {
  return <section className='portal-card desk-log-card'><div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>LOCAL DEMO RECORDS</span><h2>Transaction history</h2></div><span className='demo-pill'>NO REAL TRANSFERS</span></div><div className='table-scroll'><table className='portal-table'><thead><tr><th>Reference</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Requested</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.kind}</td><td>{format(row.amount)} {currency === 'USD' ? '' : ''}</td><td>{row.method}{row.destinationLabel ? ' · ' + row.destinationLabel : ''}</td><td><span className={'desk-status-tag status-' + row.status.toLowerCase()}>{row.status}</span></td><td>{new Date(row.createdAt).toLocaleString()}</td></tr>)}{!rows.length && <tr><td colSpan={6}>No demo deposit or withdrawal requests yet.</td></tr>}</tbody></table></div></section>;
}
