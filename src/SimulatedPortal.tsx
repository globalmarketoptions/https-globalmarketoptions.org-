import { useState, type FormEvent, type ComponentType } from 'react';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Check, Copy, ShieldAlert } from 'lucide-react';

export type DemoProfile = {
  name: string; username: string; email: string; country: string;
  currency: string; gender: string; phone: string;
};
type DemoAuthProps = {
  mode: string; user: { email?: string; name?: string } | null; error: string;
  onContinue: () => void; onDashboard: () => void; onSwitch: () => void;
  onDemoRegister: (profile: DemoProfile) => void; onDemoLogin: (email: string) => void;
};

export function DemoAuthForm({ mode, user, error, onContinue, onDashboard, onSwitch, onDemoRegister, onDemoLogin }: DemoAuthProps) {
  const signup = mode === 'signup' || mode === 'register';
  const [registered, setRegistered] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetNotice, setResetNotice] = useState(false);
  const countries = ['Australia','Brazil','Canada','France','Germany','India','Ireland','Italy','Japan','Kenya','Netherlands','Nigeria','Philippines','Singapore','South Africa','Spain','Switzerland','United Arab Emirates','United Kingdom','United States'];
  const currencies = ['USD','EUR','GBP','AUD','CAD','PHP','CHF','NGN','JPY','SGD','ZAR'];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    if (!email || !email.includes('@') || !password) {
      setFormError('Enter a valid email address and password to continue in this demo.');
      return;
    }
    if (signup) {
      const profile = {
        name: String(data.get('name') || '').trim(),
        username: String(data.get('username') || '').trim(),
        email,
        country: String(data.get('country') || ''),
        currency: String(data.get('currency') || 'USD'),
        gender: String(data.get('gender') || ''),
        phone: String(data.get('phone') || '').trim(),
      };
      const confirmation = String(data.get('confirmPassword') || '');
      if (!profile.name || profile.username.length < 3 || !profile.country || !profile.gender || !profile.phone || password.length < 8 || password !== confirmation || !data.get('terms')) {
        setFormError(password.length < 8 ? 'Use at least 8 characters for this temporary demo password.' : password !== confirmation ? 'Passwords do not match.' : !data.get('terms') ? 'Accept the Terms and Conditions to continue.' : 'Complete all required fields.');
        return;
      }
      onDemoRegister(profile);
      setRegistered(true);
      form.reset();
      return;
    }
    onDemoLogin(email);
    form.reset();
  };

  return (
    <section className="auth-panel">
      <div className="account-symbol"><Activity /></div>
      <div className="eyebrow"><span className="eyebrow-line" /> ACCOUNT ACCESS</div>
      {user ? <>
        <h1>You are signed in</h1>
        <p>Signed in as <b>{user.email || user.name || 'your provider account'}</b>. The client area is a preview and has no funded or live trading account.</p>
        <button className="primary" onClick={onDashboard}>Open dashboard <ArrowRight size={15}/></button>
      </> : registered ? <div className="registration-success" role="status">
        <span className="success-check"><Check size={24}/></span>
        <h1>Congratulation! Your registration was successful</h1>
        <p>This is a temporary frontend demo profile only. No server account was created and the password was discarded.</p>
        <button className="primary" onClick={onSwitch}>CLICK HERE TO LOGIN <ArrowRight size={15}/></button>
      </div> : <>
        <h1>{signup ? 'Create Account' : 'Account Login'}</h1>
        <div className="auth-boundary auth-security-note"><b>Account security & setup</b> This form creates only a temporary practice profile. Passwords are checked in your browser and discarded; no live trading account or trading service is connected. Provider-managed identity is available through secure email-link sign-in below. A separate bot challenge is not configured on this form.</div>
        {formError && <p className="auth-error" role="alert">{formError}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form className="demo-auth-form" onSubmit={submit} autoComplete="off">
          {signup && <>
            <label className="portal-field">Full Name<input name="name" autoComplete="name" required /></label>
            <label className="portal-field">Username<input name="username" autoComplete="username" minLength={3} required /></label>
          </>}
          <label className="portal-field">Email Address<input name="email" type="email" autoComplete="email" required /></label>
          {signup && <>
            <div className="demo-form-row">
              <label className="portal-field">Country<select name="country" defaultValue="" required><option value="" disabled>Select country</option>{countries.map(country=><option key={country}>{country}</option>)}</select></label>
              <label className="portal-field">Preferred Currency<select name="currency" defaultValue="USD">{currencies.map(currency=><option key={currency}>{currency}</option>)}</select></label>
            </div>
            <div className="demo-form-row">
              <label className="portal-field">Gender<select name="gender" defaultValue="" required><option value="" disabled>Select</option><option>Male</option><option>Female</option><option>Other</option></select></label>
              <label className="portal-field">Phone Number<input name="phone" type="tel" autoComplete="tel" required /></label>
            </div>
          </>}
          <label className="portal-field">Password<input name="password" type="password" autoComplete="new-password" minLength={signup ? 8 : 1} required aria-describedby="password-demo-warning" /></label>
          {signup && <label className="portal-field">Confirm Password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>}
          {!signup && <p id="password-demo-warning" className="portal-note">Use a disposable demo value only. It is not checked against an account and will not be stored.</p>}
          {signup && <label className="demo-terms"><input type="checkbox" name="terms" required /> I accept the <a href="#/terms">Terms and Conditions</a></label>}
          <button className="primary demo-submit" type="submit">{signup ? 'Create Practice Profile' : 'Continue to Practice'} <ArrowRight size={15}/></button>
          {signup && <p className="auth-practice-badge"><span aria-hidden="true">🔒</span> Temporary practice profile · passwords are not stored</p>}
        </form>
        {!signup && <button className="auth-reset-link" type="button" onClick={()=>setResetNotice(true)}>Reset Password</button>}
        {resetNotice && <p className="portal-note" role="status">This demo does not store passwords. No reset is needed; use a new temporary demo value or continue with secure email-link sign-in.</p>}
        <div className="auth-links"><span>{signup ? 'Already have an account?' : 'New member?'}</span><button onClick={onSwitch}>{signup ? 'Login' : 'Create an account'}</button></div>
        <div className="auth-method-card">
          <b>Secure email-link sign-in</b>
          <span>For provider-managed identity, continue without entering a password. The provider sends a one-time email link.</span>
          <button className="secondary" type="button" onClick={onContinue}>Continue with secure email sign-in</button>
        </div>
        <p className="portal-note">Review the <a href="#/terms">Terms of Service</a> and <a href="#/privacy">Privacy Policy</a>. Demo profile data stays in page memory and clears when this page is refreshed.</p>
      </>}
    </section>
  );
}

type DashboardProps = {
  user: { email?: string; name?: string } | null; profile: DemoProfile | null;
  authReady: boolean; initialSection: string; onSignIn: () => void;
  onSignOut: () => void; onHome: () => void;
  Chart: ComponentType<{ symbol: string; timeframe: string }>;
};
const marketGroups: Record<string, Array<[string, string]>> = {
  Indices: [['S&P 500','SPX'],['US 100 Cash CFD','NAS100'],['Dow Jones','DJI'],['Japan 225','JP225'],['DEU40','DAX']],
  Futures: [['E-mini S&P 500','ES'],['Nasdaq 100 Futures','NQ'],['Gold Futures','GC']],
  Bonds: [['US 10Y Treasury','US10Y'],['US 2Y Treasury','US02Y'],['Germany 10Y','DE10Y']],
  Forex: [['EUR / USD','EURUSD'],['GBP / USD','GBPUSD'],['USD / JPY','USDJPY']],
  Crypto: [['Bitcoin','BTCUSD'],['Ethereum','ETHUSD'],['Solana','SOLUSD']],
};

export function DemoDashboard({ user, profile, authReady, initialSection, onSignIn, onSignOut, onHome, Chart }: DashboardProps) {
  const [section, setSection] = useState(initialSection);
  const [wallet, setWallet] = useState('Bitcoin');
  const [symbol, setSymbol] = useState('NASDAQ:AAPL');
  const [timeframe, setTimeframe] = useState('1D');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');
  const [tradeType, setTradeType] = useState('Crypto');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('5 minutes');
  const [leverage, setLeverage] = useState('1:1');
  const [assetTab, setAssetTab] = useState('Indices');
  const [autoTrade, setAutoTrade] = useState(true);
  const [trades, setTrades] = useState<Array<{ id: string; asset: string; amount: string; action: string }>>([]);
  const [notice, setNotice] = useState('');
  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'Demo Trader';

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };
  const openSection = (next: string, message?: string) => {
    setSection(next);
    if (message) showNotice(message);
  };
  const copyReferral = async () => {
    const value = 'https://globalmarketoptions.org/?ref=DEMO-PREVIEW';
    try {
      await navigator.clipboard.writeText(value);
      showNotice('Demo referral preview link copied. Referral tracking is not connected.');
    } catch {
      showNotice(value + ' · preview only; copy is unavailable in this browser.');
    }
  };
  const placeDemoTrade = (direction: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      showNotice('Enter a demo amount greater than zero.');
      return;
    }
    setTrades(current => [{ id: 'SIM-' + Date.now().toString().slice(-6), asset: tradeType + ' · ' + symbol.split(':').pop(), amount: value.toFixed(2) + ' ' + currency, action: direction }, ...current].slice(0, 8));
    setAmount('');
    showNotice(direction + ' recorded in this temporary simulation only. No order was sent.');
  };
  const formatDemo = (value: number) => Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;

  return (
    <section className="portal-shell demo-dashboard">
      <div className="dashboard-topbar">
        <button className="dashboard-icon-button" type="button" aria-label="Back to home" onClick={onHome}>←</button>
        <a className="dashboard-brand" href="#/"><span className="brand-mark"><span></span><span></span><span></span></span><b>GLOBAL MARKET<small>OPTIONS COMPANY</small></b></a>
        <button className="dashboard-icon-button" type="button" aria-label="Notifications" onClick={()=>showNotice('No live account notifications are connected.')}><Bell size={18}/></button>
        <button className="dashboard-avatar" type="button" aria-label="Open profile settings" onClick={()=>openSection('settings')}>{displayName.slice(0,1).toUpperCase()}</button>
      </div>
      {notice && <div className="demo-toast" role="status">{notice}</div>}
      <div className="dashboard-welcome"><div><div className="eyebrow"><span className="eyebrow-line" /> SIMULATED ACCOUNT · NO REAL FUNDS</div><h1>Welcome, {displayName}</h1><p>Frontend-only demonstration. Values and trades below are invented examples and reset when this page is refreshed.</p></div><label className="dashboard-currency">Display currency<select value={currency} onChange={event=>setCurrency(event.target.value)}>{['USD','EUR','GBP','AUD','CAD','PHP','CHF','NGN','JPY','SGD','ZAR'].map(code=><option key={code}>{code}</option>)}</select><small>Unit label only; simulated amounts are not converted.</small></label></div>
      <div className="dashboard-quick-actions"><button className="quick-bot" onClick={()=>openSection('trading','Bot controls are simulation-only. No automated orders are sent.')}>Bot Trading <span>Preview</span></button><button onClick={()=>openSection('funds')}>Deposit <ArrowDownRight size={15}/></button><button onClick={()=>openSection('funds')}>Withdraw <ArrowUpRight size={15}/></button></div>
      <div className="demo-warning" role="note"><ShieldAlert size={18}/><span><b>SIMULATION ONLY</b> — no deposits, withdrawals, balances, KYC checks, referrals or trading are connected to real services.</span></div>
      <nav className="portal-tabs demo-dashboard-tabs" aria-label="Dashboard sections">{[['overview','Overview'],['trading','Trading console'],['markets','Markets'],['funds','Funds & verification'],['settings','Profile']].map(([id,label])=><button type="button" className={section===id?'active':''} onClick={()=>setSection(id)} key={id}>{label}</button>)}</nav>
      {section === 'overview' && <>
        <div className="demo-stat-grid">{[['Total Balance',formatDemo(10000),'SIMULATED'],['Profit',formatDemo(425),'SIMULATED'],['Trade Bonus',formatDemo(250),'NOT CASH'],['Referral Bonus',formatDemo(75),'NOT CASH'],['Total Won','12','DEMO COUNTER'],['Total Loss','4','DEMO COUNTER']].map(([label,value,tag])=><article className="demo-stat-card" key={label}><span>{label}</span><b>{value}</b><small>{tag}</small></article>)}</div>
        <div className="dashboard-layout-grid">
          <section className="portal-card referral-card"><div><span className="dashboard-card-kicker">REFERRAL PREVIEW</span><h2>Referral link</h2><p>This sample URL is not tracked and does not create referral rewards.</p></div><div className="referral-copy-row"><code>globalmarketoptions.org/?ref=DEMO-PREVIEW</code><button type="button" onClick={copyReferral}>Copy <Copy size={14}/></button></div></section>
          <section className="portal-card progress-card"><div className="progress-label"><span>SIGNAL STRENGTH</span><b>100% · illustrative</b></div><div className="demo-progress"><i style={{width:'100%'}}/></div><div className="progress-label"><span>TRADING PROGRESS</span><b>100% · sample</b></div><div className="demo-progress"><i style={{width:'100%'}}/></div><p className="portal-note">Indicators are decorative demo values, not recommendations or account activity.</p></section>
          <section className="portal-card summary-card"><h2>Transactions & verification</h2><div className="summary-row"><span>Total Deposits <small>sample only</small></span><b>{formatDemo(1250)}</b><button onClick={()=>openSection('funds')}>Deposit</button></div><div className="summary-row"><span>Total Withdrawals <small>sample only</small></span><b>{formatDemo(250)}</b><button onClick={()=>openSection('funds')}>Withdraw</button></div><div className="verification-tile"><span>Verification status</span><b>Your account is not verified</b><small>KYC submission is not configured in this demo.</small><button onClick={()=>openSection('settings','Identity verification is unavailable in this frontend demo.')}>Verify</button></div></section>
        </div>
        <div className="portal-columns"><section className="portal-card"><h2>Customer support</h2><p><a href="mailto:support@globalmarketoptions.org">support@globalmarketoptions.org</a><br/><a href="mailto:info@globalmarketoptions.org">info@globalmarketoptions.org</a></p><a className="secondary" href="#/contact">Contact support</a></section><section className="portal-card"><h2>Account access</h2><p>{user ? 'Secure email-link identity is managed by the sign-in provider.' : authReady ? 'Temporary demo profile in this browser session.' : 'Checking account status…'}</p>{user ? <button className="secondary" onClick={onSignOut}>Sign out</button> : <button className="secondary" onClick={onSignIn}>Secure email-link sign in</button>}</section></div>
      </>}
      {section === 'trading' && <>
        <div className="trade-console-grid">
          <section className="trade-placement-card">
            <div className="dashboard-section-heading"><div><span className="dashboard-card-kicker">PAPER TRADING</span><h2>Trade placement</h2></div><span className="demo-pill">SIMULATION</span></div>
            <form onSubmit={event=>{event.preventDefault();const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;placeDemoTrade(submitter?.value||'BUY');}}>
              <label className="portal-field">Trade Type<select value={tradeType} onChange={event=>setTradeType(event.target.value)}>{['Crypto','Forex','Indices','Stocks','Commodities'].map(type=><option key={type}>{type}</option>)}</select></label>
              <label className="portal-field">Asset<select value={symbol} onChange={event=>setSymbol(event.target.value)}>{[['BITSTAMP:BTCUSD','Bitcoin · BTC/USD'],['COINBASE:ETHUSD','Ethereum · ETH/USD'],['NASDAQ:AAPL','Apple · AAPL'],['FX:EURUSD','EUR/USD'],['OANDA:XAUUSD','Gold · XAU/USD'],['SP:SPX','S&P 500']].map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
              <label className="portal-field">Amount ({currency})<input type="number" min="1" step="0.01" value={amount} onChange={event=>setAmount(event.target.value)} placeholder="Enter demo amount" /></label>
              <div className="demo-form-row"><label className="portal-field">Duration<select value={duration} onChange={event=>setDuration(event.target.value)}>{['1 minute','5 minutes','15 minutes','1 hour','1 day'].map(item=><option key={item}>{item}</option>)}</select></label><label className="portal-field">Leverage<select value={leverage} onChange={event=>setLeverage(event.target.value)}>{['1:1','2:1','5:1','10:1'].map(item=><option key={item}>{item}</option>)}</select></label></div>
              <div className="demo-order-buttons"><button className="demo-buy" type="submit" value="BUY">BUY <span>simulated</span></button><button className="demo-sell" type="submit" value="SELL">SELL <span>simulated</span></button></div>
            </form>
            <p className="portal-note">Orders only add a row to the temporary on-screen log. Nothing is transmitted to a broker or exchange.</p>
          </section>
          <section className="portal-card chart-console-card"><div className="dashboard-section-heading"><div><span className="dashboard-card-kicker">THIRD-PARTY WIDGET</span><h2>Market chart</h2></div><span className="demo-pill">DATA MAY VARY</span></div><label className="portal-field">Chart instrument<select value={symbol} onChange={event=>setSymbol(event.target.value)}><option value="BITSTAMP:BTCUSD">Bitcoin · USD</option><option value="COINBASE:ETHUSD">Ethereum · USD</option><option value="NASDAQ:AAPL">Apple · NASDAQ</option><option value="FX:EURUSD">EUR / USD</option><option value="SP:SPX">S&amp;P 500</option></select></label><div className="timeframe-row" role="group" aria-label="Chart timeframe">{['1D','1M','3M','1Y','5Y','All'].map(period=><button type="button" aria-pressed={timeframe===period} className={timeframe===period?'active':''} onClick={()=>setTimeframe(period)} key={period}>{period}</button>)}</div><Chart symbol={symbol} timeframe={timeframe}/><p className="portal-note">TradingView may show third-party market data; quote availability, delays and licensing vary. This widget is not connected to an order service.</p></section>
        </div>
        <section className="portal-card asset-list-card"><div className="dashboard-section-heading"><div><span className="dashboard-card-kicker">MARKET WATCH</span><h2>Asset classes</h2></div><span className="demo-pill">NO APP PRICE FEED</span></div><div className="asset-tabs" role="tablist" aria-label="Market asset classes">{Object.keys(marketGroups).map(tab=><button type="button" role="tab" aria-selected={assetTab===tab} className={assetTab===tab?'active':''} onClick={()=>setAssetTab(tab)} key={tab}>{tab}</button>)}</div><div className="demo-asset-list"><div className="demo-asset-header"><span>Asset</span><span>Indicative price</span><span>Change</span></div>{marketGroups[assetTab].map(([name,ticker])=><div className="demo-asset-row" key={ticker}><span className="demo-asset-name"><i>{ticker.slice(0,1)}</i><b>{name}<small>{ticker} · illustrative list</small></b></span><b>— {currency}</b><span className="demo-change">—</span></div>)}</div><p className="portal-note">Prices and percentage changes are omitted because no verified quote feed is connected to this application.</p></section>
        <section className="portal-card recent-trades-card"><div className="dashboard-section-heading"><h2>Recent trades</h2><span className="demo-pill">SESSION ONLY</span></div><div className="table-scroll"><table className="portal-table"><thead><tr><th>ID</th><th>Asset</th><th>Amount</th><th>Action</th></tr></thead><tbody>{trades.length ? trades.map(trade=><tr key={trade.id}><td>{trade.id}</td><td>{trade.asset}</td><td>{trade.amount}</td><td className={trade.action==='BUY'?'trade-buy-text':'trade-sell-text'}>{trade.action}</td></tr>) : <tr><td colSpan={4}>No simulated orders in this page session.</td></tr>}</tbody></table></div></section>
      </>}
      {section === 'markets' && <section className="portal-card asset-list-card"><div className="dashboard-section-heading"><h2>Market instruments</h2><span className="demo-pill">DEMO LIST</span></div><div className="asset-tabs" role="tablist" aria-label="Market asset classes">{Object.keys(marketGroups).map(tab=><button type="button" role="tab" aria-selected={assetTab===tab} className={assetTab===tab?'active':''} onClick={()=>setAssetTab(tab)} key={tab}>{tab}</button>)}</div><div className="demo-asset-list">{marketGroups[assetTab].map(([name,ticker])=><div className="demo-asset-row" key={ticker}><span className="demo-asset-name"><i>{ticker.slice(0,1)}</i><b>{name}<small>{ticker}</small></b></span><b>— {currency}</b><span className="demo-change">—</span></div>)}</div><p className="portal-note">No live quote feed is connected.</p></section>}
      {section === 'funds' && <div className="portal-columns"><section className="portal-card"><h2>Deposit preview</h2><p>No real deposits are supported. Never send funds or credentials to this demo.</p><label className="portal-field">Payment rail<select value={wallet} onChange={event=>setWallet(event.target.value)}><option>Bitcoin</option><option>Ethereum</option><option>USDT · TRC20</option><option>USDT · ERC20</option><option>Fiat</option></select></label><div className="portal-address-empty"><b>Demo only — no payment address</b>Deposit provider and account ledger are not connected.<div className="portal-qr-empty">No QR available</div></div></section><section className="portal-card"><h2>Withdrawal preview</h2><p>No withdrawal processing is enabled.</p><label className="portal-field">Amount<input type="number" placeholder="Simulation only" disabled /></label><label className="portal-field">Destination<input placeholder="No destination is collected" disabled /></label><button className="portal-disabled" disabled>Withdraw unavailable</button></section><section className="portal-card verification-card"><h2>Account verification</h2><b>Your account is not verified</b><p>KYC submission is not configured. No identity documents should be uploaded here.</p><button className="portal-disabled" disabled>Verify unavailable</button></section></div>}
      {section === 'settings' && <div className="profile-settings-grid"><section className="portal-card"><h2>Demo profile</h2><p>{displayName}</p><p>{profile?.email || user?.email || 'No email provided'}</p><p>{profile?.country || 'Country not set'} · {currency}</p><p className="portal-note">This temporary profile is held in page memory only. It is not saved to an account database.</p></section><section className="portal-card"><h2>Authentication</h2><p>Demo password values are discarded after form validation. Provider-managed email link sign-in is available separately.</p>{user ? <button className="secondary" onClick={onSignOut}>Sign out</button> : <button className="secondary" onClick={onSignIn}>Secure email-link sign in</button>}</section><section className="portal-card"><h2>Security & verification</h2><p>MFA, reauthentication and KYC services are not configured for this preview.</p><button className="portal-disabled" disabled>Verification unavailable</button></section></div>}
      <div className="portal-bottom-spacer" />
      <div className="demo-status-bar"><span><i className={autoTrade?'status-active':''}/><b>Auto-Trade: {autoTrade?'Active':'Paused'}</b> <small>simulation only</small></span><span>Balance <b>{formatDemo(10000)}</b></span><button type="button" onClick={()=>setAutoTrade(value=>!value)}>{autoTrade?'Pause demo':'Resume demo'}</button></div>
    </section>
  );
}
