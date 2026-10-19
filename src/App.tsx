import { useState } from 'react';
import { HeroMotionCanvas } from './HeroMotionCanvas';
import { DemoAuthForm, type DemoProfile } from './SimulatedPortal';
import { DemoTradingDesk } from './DemoTradingDesk';
import { CertificateViewer } from './CertificateViewer';
import { InvestmentAllocation } from './InvestmentAllocation';
import { InvestmentPricingCards } from './InvestmentPricingCards';
import { BitcoinComparison } from './BitcoinComparison';
import { LiveMarketGrid, LiveMarketTicker } from './LiveMarketWidgets';
import { LiveMarketOverview } from './LiveMarketOverview';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Fingerprint,
  Globe2,
  KeyRound,
  LockKeyhole,
  Menu,
  Minus,
  MessageCircle,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { api, auth, type AuthUser } from '@appdeploy/client';
import { AccountWalletPanel, AdminAccounts } from './AccountCenter';

const nav = [
  'About Us',
  'Markets',
  'Crypto',
  'Forex',
  'Stocks and ETFs',
  'Copy Trading',
  'Smart Portfolios',
  'Fees',
  'Help Centre',
  'Contact',
  'FAQs',
];
const mobileNavGroups = [
  { label: 'Explore', links: [['Home', ''], ['FAQs', 'faqs'], ['About Us', 'about'], ['Contact', 'contact']] },
  { label: 'Markets', links: [['Forex Trading', 'forex'], ['Crypto Trading', 'crypto'], ['Stocks Trading', 'stocks'], ['Copy Trading', 'copy-trading']] },
  { label: 'Legal', links: [['Privacy Policy', 'privacy'], ['Cookie Policy', 'cookies'], ['Terms of Service', 'terms']] },
];
const slugs = {
  'About Us': 'about',
  Markets: 'markets',
  Crypto: 'crypto',
  Forex: 'forex',
  'Stocks and ETFs': 'stocks',
  'Copy Trading': 'copy-trading',
  'Smart Portfolios': 'portfolios',
  Fees: 'fees',
  'Help Centre': 'help',
  Contact: 'contact',
  FAQs: 'faqs',
  'Terms of Service': 'terms',
  'Privacy Policy': 'privacy',
  'Cookie Policy': 'cookies',
  'Risk Disclosure': 'risk',
  'Security & Compliance': 'security',
};
const instruments = [
  { name: 'Bitcoin', symbol: 'BTC', type: 'Crypto', tone: 'orange', icon: '₿' },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'Crypto',
    tone: 'violet',
    icon: '◆',
  },
  {
    name: 'EUR / USD',
    symbol: 'EURUSD',
    type: 'Forex',
    tone: 'blue',
    icon: '€',
  },
  {
    name: 'Gold',
    symbol: 'XAU',
    type: 'Commodities',
    tone: 'gold',
    icon: 'Au',
  },
  { name: 'S&P 500', symbol: 'SPX', type: 'Index', tone: 'green', icon: 'S' },
  { name: 'Apple', symbol: 'AAPL', type: 'Stocks', tone: 'slate', icon: 'A' },
];
const legal = {
  terms: [
    'Terms of Service',
    'A clear foundation for exploring a demo platform.',
    'This initial website is informational. No brokerage, custody, investment advice, payment processing, or real-money trading is provided. By using this site you agree to use it lawfully and understand that demo interface concepts are illustrative only.',
  ],
  privacy: [
    'Privacy Policy',
    'Your information deserves careful handling.',
    'The site offers provider-managed email-link sign-in and stores a limited server-side demo account record after sign-in: email, display name, simulated USD balance, account status, demo requests and activity history. It does not process real deposits, withdrawals, trades, payments or identity documents. AppDeploy provides authentication and application database services; provider retention and processing locations require owner confirmation. Tawk.to chat and TradingView are embedded third-party services.',
  ],
  cookies: [
    'Cookie Policy',
    'A straightforward approach to cookies.',
    'The site itself does not intentionally set advertising or analytics cookies. Embedded Tawk.to chat and TradingView widgets may use cookies or similar technologies under their own policies; their exact behavior and retention have not been verified. The authentication provider may use provider-managed session storage. Review third-party terms before using these features.',
  ],
  risk: [
    'Risk Disclosure',
    'Trading involves significant risk.',
    'The value of investments can fall as well as rise, and you may lose some or all of your capital. Digital assets can be highly volatile. This website is a concept and does not provide financial advice, execution, or access to financial products. Nothing here is an offer or recommendation.',
  ],
};
function Logo() {
  return (
    <a className="brand" href="#/">
      <span className="brand-mark">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span>
        GLOBAL MARKET<small>OPTIONS COMPANY</small>
      </span>
    </a>
  );
}
function TawkChat() {
  useEffect(() => {
    const source = 'https://embed.tawk.to/6ad0796de35a9734cc152afd/1k4v5klpe';
    if (document.querySelector('script[src="' + source + '"]')) return;
    const chatWindow = window as Window & { Tawk_API?: Record<string, unknown>; Tawk_LoadStart?: Date };
    chatWindow.Tawk_API = chatWindow.Tawk_API || {};
    chatWindow.Tawk_LoadStart = new Date();
    const script = document.createElement('script');
    script.async = true;
    script.src = source;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);
  }, []);
  return null;
}

function FloatingSupportActions() {
  const openLiveChat = () => {
    const chatWindow = window as Window & { Tawk_API?: { maximize?: () => void } };
    if (typeof chatWindow.Tawk_API?.maximize === 'function') {
      chatWindow.Tawk_API.maximize();
      return;
    }
    window.location.hash = '#/contact';
  };

  return (
    <div className="floating-support-actions" aria-label="Customer support shortcuts">
      <button type="button" onClick={openLiveChat} aria-label="Open live chat">
        <MessageCircle size={18} /> <span>Live chat</span>
      </button>
      <a href="https://wa.me/?text=Hello%2C%20I%20need%20support%20with%20the%20Global%20Market%20Options%20demo." target="_blank" rel="noopener noreferrer" aria-label="Open WhatsApp with a support message">
        <MessageCircle size={18} /> <span>WhatsApp</span>
      </a>
    </div>
  );
}

function App() {
  const readRoute = () => {
    const current = location.hash.slice(2).split('#')[0];
    return current === 'signup' ? 'register' : current;
  };
  const [route, setRoute] = useState(readRoute());
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketTab, setMarketTab] = useState('Crypto');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [demoProfile, setDemoProfile] = useState<DemoProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const go = (slug = '') => {
    const nextRoute = slug === 'signup' ? 'register' : slug;
    location.hash = nextRoute ? '#/' + nextRoute : '#/';
    setRoute(nextRoute);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.onhashchange = () => {
    setRoute(readRoute());
    setMenuOpen(false);
  };
  const title =
    route === 'register' ? 'Create Account' :
    route === 'login' ? 'Account Login' :
    route === 'demo' ? 'Practice Trading' :
    route === 'admin/accounts' ? 'Account Management' :
    route === 'admin/tickets' ? 'Support Ticket Admin' :
    Object.keys(slugs).find(k => slugs[k] === route) ||
    Object.keys(legal).find(k => k === route);
  const account = route === 'login' || route === 'register' || route === 'signup';
  const page = route ? (legal[route] ? legal[route] : null) : null;
  const startAuth = async (destination = 'dashboard') => {
    setAuthError('');
    try {
      const { user } = await auth.signIn({ scope: 'openid email profile offline_access' });
      setAuthUser(user);
      void api.get('/api/client-account').catch(() => {});
      setProfileOpen(false);
      go(destination);
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      setAuthError(code === 'popup_blocked' ? 'Allow pop-ups for this site and try again.' : code === 'popup_closed' ? 'Sign-in was cancelled. You can try again when ready.' : 'Sign-in could not be completed. Please try again.');
    }
  };
  const openStrategyTopUp = (strategy: string) => {
    if (!authUser) {
      setAuthError('Sign in to continue to wallet top-up.');
      go('login');
      return;
    }
    setSelectedStrategy(strategy);
    setTopUpOpen(true);
  };
  const startDemoSession = (email: string) => {
    setDemoProfile(current => current ? { ...current, email } : { name: email.split('@')[0], username: '', email, country: '', currency: 'USD', gender: '', phone: '' });
    go('demo');
  };
  const startPracticeSession = () => {
    setDemoProfile({ name: 'Practice Account', username: 'practice', email: '', country: '', currency: 'USD', gender: '', phone: '' });
    go('demo');
  };
  const signOut = async () => {
    await auth.signOut();
    setAuthUser(null);
    setDemoProfile(null);
    setProfileOpen(false);
    go('');
  };
  useEffect(() => {
    let active = true;
    auth.getUser().then(user => { if (active) setAuthUser(user); if (user) void api.get('/api/client-account').catch(() => {}); }).catch(() => {}).finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    document.title = route === 'admin/accounts'
      ? 'Account Management | Global Market Options Company'
      : route === 'admin/tickets'
        ? 'Support Ticket Admin | Global Market Options Company'
        : route === 'security'
      ? 'EV SSL Security & Compliance Disclosure | Global Marketoptions Company'        : route === 'privacy'
        ? 'Privacy Policy | Global Marketoptions Company'
        : route === 'demo'
          ? 'Practice Trading | Global Marketoptions Company'
          : route === 'dashboard' || route === 'settings'
            ? 'Client Portal Preview | Global Marketoptions Company'
          : 'Global Market Options Company';
  }, [route]);
  return (
    <div className="site">
      <TawkChat />\n      <FloatingSupportActions />
      <LiveMarketTicker />
      <div className="topline">
        <div className="wrap topinner">
          <span className="header-contact-links" aria-label="Public contact links">
            <a href="mailto:support@globalmarketoptions.org" aria-label="Email support at support@globalmarketoptions.org">Support</a>
            <i />
            <a href="mailto:info@globalmarketoptions.org" aria-label="Email info at info@globalmarketoptions.org">Info</a>
          </span>
          <span className="topright">
            <Globe2 size={14} /> Global access <i /> Demo experience
          </span>
        </div>
      </div>
      <header className="header">
        <div className="wrap headinner">
          <Logo />
          <nav id="primary-navigation" aria-label="Primary navigation" className={menuOpen ? 'nav open' : 'nav'}>
            {menuOpen ? (
              <div className="mobile-nav-content">
                <div className="mobile-nav-groups">
                  {mobileNavGroups.map(group => (
                    <section className="mobile-nav-group" key={group.label} aria-label={group.label}>
                      <h2>{group.label}</h2>
                      {group.links.map(([label, slug]) => (
                        <a key={label} href={'#/' + slug} aria-current={route === slug ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{label}<ArrowRight size={14} /></a>
                      ))}
                    </section>
                  ))}
                  <section className="mobile-nav-group" aria-label="Trading products">
                    <h2>More</h2>
                    <span className="mobile-nav-unavailable">Crypto Mining <small>Not available</small></span>
                  </section>
                </div>
                <div className="mobile-nav-actions">
                  <button className="secondary" onClick={() => go('login')}>Sign in</button>
                  <button className="primary" onClick={() => go('register')}>Sign up <ArrowRight size={14} /></button>
                  <button className="practice-mobile-button" onClick={startPracticeSession}>Try Demo Account</button>
                </div>
                <p className="mobile-nav-note">Market and account areas are informational previews. Trading, mining, deposits and withdrawals are not active.</p>
              </div>
            ) : (
              <>
                {nav.slice(0, 5).map(n => (
                  <a key={n} className={title === n ? 'selected' : ''} href={'#/' + slugs[n]} aria-current={route === slugs[n] ? 'page' : undefined}>
                    {n}
                  </a>
                ))}
                <details className="nav-more">
                  <summary aria-label="More public pages">More <ChevronDown size={13} /></summary>
                  <div className="nav-more-menu" aria-label="More public pages">
                    {nav.slice(5).map(n => (
                      <a key={n} className={title === n ? 'selected' : ''} href={'#/' + slugs[n]} aria-current={route === slugs[n] ? 'page' : undefined}>
                        {n}<ArrowRight size={13} />
                      </a>
                    ))}
                    <a href="#/security" aria-current={route === 'security' ? 'page' : undefined}>Security &amp; Compliance <ArrowRight size={13} /></a>
                    <a href="#/terms" aria-current={route === 'terms' ? 'page' : undefined}>Terms of Service <ArrowRight size={13} /></a>
                    <a href="#/privacy" aria-current={route === 'privacy' ? 'page' : undefined}>Privacy Policy <ArrowRight size={13} /></a>
                  </div>
                </details>
              </>
            )}
          </nav>
          <div className="headactions">
            {authUser ? (
              <div className="profile-menu">
                <button className="profile-trigger" type="button" aria-label="Open account menu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}>{(authUser.name || authUser.email || 'A').slice(0, 1).toUpperCase()}<ChevronDown size={13}/></button>
                {profileOpen && <div className="profile-dropdown"><span className="profile-email">{authUser.email || 'Signed-in account'}</span><button onClick={() => { go('dashboard'); setProfileOpen(false); }}>Dashboard</button><button onClick={() => { go('settings'); setProfileOpen(false); }}>Settings</button><button onClick={signOut}>Sign out</button></div>}
              </div>
            ) : (
              <><button className="practice-header-button" onClick={startPracticeSession}>Try Demo Account</button><button className="text-btn" onClick={() => go('login')}>Sign in</button><button className="primary small" onClick={() => go('register')}>Get started <ArrowRight size={15} /></button></>
            )}
          </div>
          <button
            className="mobile-menu"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {!route && (
        <>
          <main>
            <section className="hero hero-video-mode">
              <HeroMotionCanvas />
              <video className="hero-video" autoPlay loop muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onError={(event) => event.currentTarget.classList.add('hero-video-unavailable')}>
                <source src="https://assets.mixkit.co/videos/preview/mixkit-electronic-ticker-in-the-street-4128-large.mp4" type="video/mp4" />
              </video>
              <div className="hero-video-overlay" aria-hidden="true" />
              <div className="wrap hero-grid">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> Welcome to Global Market Options
                  </div>
                  <h1>
                    Experience The
                    <br />
                    <em>Difference</em>
                  </h1>
                  <p className="hero-lede">
                    Explore live-updating market quotes and charts across Crypto, Stocks, Forex, ETFs and Indices. The practice trading experience is simulated; customer accounts and live copy-trade execution are not connected.
                  </p>
                  <div className="hero-ctas">
                    <button className="hero-cta-button hero-cta-primary" onClick={() => go('register')}>
                      REGISTER ACCOUNT <ArrowRight size={16} />
                    </button>
                    <button className="hero-cta-button hero-cta-secondary" onClick={() => go('login')}>
                      LOGIN
                    </button>
                    <button className="hero-cta-button hero-cta-tertiary" onClick={startPracticeSession}>
                      PRACTICE TRADING
                    </button>
                  </div>
                  <div className="hero-assurance">
                    <span>
                      <Shield size={15} /> Built around transparency
                    </span>
                    <span>
                      <LockKeyhole size={14} /> Demo environment
                    </span>
                  </div>
                </div>
                <div className="visual-wrap">
                  <div className="visual-glow" />
                  <div className="chart-card">
                    <div className="chart-top">
                      <div>
                        <span className="chart-label">MARKET OVERVIEW</span>
                        <div className="chart-title">A global perspective</div>
                      </div>
                      <span className="tag">
                        <span className="live-dot" /> Live market data
                      </span>
                    </div>
                    <div className="chart-period">
                      <span>Live prices &amp; market movement</span>
                      <span>Crypto · Stocks · Forex · Commodities</span>
                    </div>
                    <LiveMarketOverview />
                    <div className="chart-footer">
                      <div>
                        <span>Explore</span>
                        <b>Global markets</b>
                      </div>
                      <div>
                        <span>Learn</span>
                        <b>At your own pace</b>
                      </div>
                      <div className="chart-arrow">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                  <div className="float-card">
                    <span className="float-icon">
                      <BarChart3 size={17} />
                    </span>
                    <span>
                      <b>One clear view</b>
                      <small>Markets, made approachable</small>
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <InvestmentAllocation />

            <section className="section wrap trading-hub" aria-labelledby="hub-title">
              <div className="section-head">
                <div><div className="eyebrow"><span className="eyebrow-line" /> EXPLORE ASSET CLASSES</div><h2 id="hub-title">One hub. Global markets.</h2></div>
                <span className="feed-status"><i /> TradingView market widgets</span>
              </div>
              <div className="market-tabs" role="tablist" aria-label="Asset classes">
                {['Crypto','Stocks','Forex','Commodities'].map(tab => <button type="button" role="tab" aria-selected={marketTab===tab} className={marketTab===tab?'active':''} onClick={()=>setMarketTab(tab)} key={tab}>{tab}</button>)}
              </div>
              <LiveMarketGrid activeTab={marketTab} />
              <p className="micro-note">Quotes, daily percentage changes and mini charts are supplied through TradingView widgets. Data coverage and timing can vary by exchange or instrument; displayed market data is informational and does not represent executable prices.</p>
              <section className="verified-activity-feed" aria-live="polite"><div><b>Market activity</b><span>Verified activity feed</span></div><p>Customer deposit and withdrawal events will appear here when a verified transaction service is connected. No activity is being reported currently.</p></section>
            </section>
            <section className="feature-section copy-preview">
              <div className="wrap">
                <div className="section-head"><div><div className="eyebrow"><span className="eyebrow-line" /> STRATEGY ALLOCATION</div><h2>Explore Live Managed Strategy Portfolios</h2><p>Explore automated strategy concepts and institutional-style market signals. Live execution availability depends on verified service integration.</p></div><span className="feed-status">Live execution not enabled</span></div>
                <div className="copy-grid">
                  {['Momentum framework','Macro framework','Balanced framework'].map((name,index)=><article className="copy-card" key={name}><span className="copy-avatar">{['M','G','B'][index]}</span><div><small>PRO STRATEGY FRAMEWORK</small><h3>{name}</h3><p>Review a strategy framework and allocation options for your account. Automated portfolio management and live trade execution require a verified execution provider; no live performance record is currently available.</p></div><div className="copy-metrics"><span>Market feed <b>TradingView</b></span><span>Execution <b>Awaiting integration</b></span></div><button type="button" onClick={() => openStrategyTopUp(name)}>{authUser ? 'Review allocation' : 'Sign in to allocate'}</button></article>)}
                </div>
              </div>
            </section>
            <InvestmentPricingCards />
            <BitcoinComparison />
            <section className="portal-band"><div className="wrap portal-preview"><div><div className="eyebrow"><span className="eyebrow-line" /> CLIENT PORTAL</div><h2>Account services are not active.</h2><p>No customer balances, deposits, withdrawals, trading accounts or admin tools are connected to this preview.</p></div><div className="portal-actions"><button className="primary" onClick={()=>go('signup')}>Sign up <ArrowRight size={15}/></button><button className="secondary" onClick={()=>go('login')}>Login</button></div><div className="portal-balance"><small>DEMO WALLET</small><b>— USD</b><span>Not a customer balance</span></div></div></section>
            <section className="ticker">
              <div className="wrap ticker-inner">
                <span className="ticker-title">EXPLORE ASSET CLASSES</span>
                {[
                  'Digital assets',
                  'Foreign exchange',
                  'Global equities',
                  'Market indices',
                ].map((x, i) => (
                  <div className="ticker-item" key={x}>
                    <span className={'ticker-icon t' + i}>
                      {['₿', '↔', '◉', '⌁'][i]}
                    </span>
                    <span>{x}</span>
                    <ArrowUpRight size={14} />
                  </div>
                ))}
              </div>
            </section>
            <section className="section wrap">
              <div className="section-head">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> THE MARKETS, IN FOCUS
                  </div>
                  <h2>Explore what moves you.</h2>
                </div>
                <button className="link-btn" onClick={() => go('markets')}>
                  View all markets <ArrowRight size={15} />
                </button>
              </div>
              <div className="asset-grid">
                {instruments.map((item, i) => (
                  <button
                    className="asset-card"
                    key={item.symbol}
                    onClick={() =>
                      go(
                        item.type === 'Crypto'
                          ? 'crypto'
                          : item.type === 'Forex'
                            ? 'forex'
                            : 'stocks'
                      )
                    }
                  >
                    <span className={'asset-icon ' + item.tone}>
                      {item.icon}
                    </span>
                    <span className="asset-info">
                      <b>{item.name}</b>
                      <small>
                        {item.type} <i /> {item.symbol}
                      </small>
                    </span>
                    <span className="asset-go">
                      <ArrowUpRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              <p className="micro-note">
                <Minus size={12} /> Instrument names are examples for navigation
                only. No market prices are displayed.
              </p>
            </section>
            <section className="feature-section">
              <div className="wrap feature-grid">
                <div className="feature-copy">
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> THOUGHTFUL BY DESIGN
                  </div>
                  <h2>
                    Made for a more
                    <br />
                    informed perspective.
                  </h2>
                  <p>
                    From your first market overview to a closer look at
                    individual asset classes, find a calmer, more considered way
                    to explore the world of investing.
                  </p>
                  <button
                    className="secondary light"
                    onClick={() => go('about')}
                  >
                    Our approach <ArrowRight size={15} />
                  </button>
                </div>
                <div className="feature-cards">
                  <article>
                    <span className="feature-num">01</span>
                    <span className="feature-icon">
                      <Globe2 />
                    </span>
                    <h3>Markets in context</h3>
                    <p>
                      Explore a range of asset classes in one considered
                      experience.
                    </p>
                    <a href="#/markets">
                      Explore markets <ArrowRight size={14} />
                    </a>
                  </article>
                  <article>
                    <span className="feature-num">02</span>
                    <span className="feature-icon">
                      <Sparkles />
                    </span>
                    <h3>Built for clarity</h3>
                    <p>
                      Helpful explanations keep complex topics easy to navigate.
                    </p>
                    <a href="#/help">
                      Visit the Help Centre <ArrowRight size={14} />
                    </a>
                  </article>
                </div>
              </div>
            </section>
            <section className="section wrap approach">
              <div className="section-head">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> A PLATFORM, WITH PURPOSE
                  </div>
                  <h2>Confidence starts with clarity.</h2>
                </div>
                <p className="head-note">
                  We believe a better financial experience begins with honest
                  information, thoughtful design, and the freedom to learn
                  before you act.
                </p>
              </div>
              <div className="value-grid">
                <div>
                  <span className="value-icon">
                    <Shield />
                  </span>
                  <h3>Transparency first</h3>
                  <p>
                    Clear descriptions of what is available and what is not.
                  </p>
                </div>
                <div>
                  <span className="value-icon">
                    <BarChart3 />
                  </span>
                  <h3>Tools with context</h3>
                  <p>Designed to help you explore, understand, and compare.</p>
                </div>
                <div>
                  <span className="value-icon">
                    <LockKeyhole />
                  </span>
                  <h3>Responsible by default</h3>
                  <p>
                    Real-money services remain unavailable in this initial
                    experience.
                  </p>
                </div>
              </div>
            </section>
            <section className="callout">
              <div className="wrap callout-inner">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line" /> START WITH THE BASICS
                  </div>
                  <h2>Curiosity is a good place to begin.</h2>
                  <p>
                    Explore the platform concept and learn how different markets
                    work.
                  </p>
                </div>
                <button className="primary" onClick={() => go('help')}>
                  Visit the Help Centre <ArrowRight size={16} />
                </button>
              </div>
            </section>
          </main>
          <Footer go={go} />
        </>
      )}
      {route && (
        <main className="inner-page">
          <div className="wrap">
            <div className="breadcrumb">
              <a href="#/">Home</a>
              <span>/</span>
              <span>{title || (account ? 'Account access' : 'Page')}</span>
            </div>
            {route === 'admin/accounts' ? (
              <AdminAccounts user={authUser} authReady={authReady} onSignIn={() => startAuth('admin/accounts')} />
            ) : route === 'admin/tickets' ? (
              <SupportAdmin user={authUser} authReady={authReady} onSignIn={() => startAuth('admin/tickets')} />
            ) : route === 'dashboard' || route === 'settings' || route === 'demo' ? (
              <ClientDashboard
                user={route === 'demo' ? null : authUser}
                profile={route === 'demo' ? (demoProfile || { name: 'Practice Account', username: 'practice', email: '', country: '', currency: 'USD', gender: '', phone: '' }) : demoProfile}
                authReady={authReady}
                initialSection={route === 'settings' ? 'settings' : route === 'demo' ? 'trading' : 'overview'}
                onSignIn={() => go('login')}
                onSignOut={signOut}
                onHome={() => go('')}
                AccountPanel={AccountWalletPanel}
              />
            ) : route === 'security' ? (
              <SecurityDisclosure />
            ) : route === 'privacy' ? (
              <PrivacyPolicy />
            ) : account ? (
              <AuthPage mode={route} user={authUser} error={authError} onContinue={() => startAuth()} onDashboard={() => go('dashboard')} onSwitch={() => go(route === 'register' || route === 'signup' ? 'login' : 'register')} onDemoRegister={profile => setDemoProfile(profile)} onDemoLogin={startDemoSession} />
            ) : page ? (
              <div className="legal-content">
                <div className="eyebrow">
                  <span className="eyebrow-line" /> IMPORTANT INFORMATION
                </div>
                <h1>{page[0]}</h1>
                <p className="inner-lede">{page[1]}</p>
                <div className="legal-box">
                  <p>{page[2]}</p>
                  <p>
                    Global Market Options Company does not claim to be licensed,
                    regulated, insured, or approved. No real financial services
                    are enabled through this site.
                  </p>
                </div>
                <button className="link-btn" onClick={() => go('help')}>
                  Questions? Visit Help Centre <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <PublicPage
                route={route}
                title={title}
                go={go}
                faqOpen={faqOpen}
                setFaqOpen={setFaqOpen}
              />
            )}
          </div>
        </main>
      )}
      {route && <Footer go={go} />}
      {topUpOpen && <div className="desk-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setTopUpOpen(false); }}><section className="desk-modal" role="dialog" aria-modal="true" aria-labelledby="strategy-topup-title"><div className="dashboard-section-heading"><div><span className="dashboard-card-kicker">STRATEGY ALLOCATION</span><h2 id="strategy-topup-title">{selectedStrategy}</h2></div><button className="dashboard-icon-button" type="button" aria-label="Close top up modal" onClick={() => setTopUpOpen(false)}>×</button></div><p>Wallet top-up is not available until a verified payment provider is connected. No deposit will be collected and no strategy allocation will be executed.</p><button className="desk-primary" type="button" onClick={() => { setTopUpOpen(false); go('dashboard'); }}>View wallet</button></section></div>}
    </div>
  );
}
function SecurityDisclosure() {
  const sections = [
    {
      id: 'security-commitment',
      title: 'Security commitment',
      icon: ShieldCheck,
      text: 'Protecting account confidentiality, information integrity and service availability requires layered controls, careful access management, secure communications, privacy safeguards, fraud prevention and regular review. Signed-in visitors now have a limited server-side demo account record and simulated request history. No real financial service workflows are enabled. The admin API is restricted to an explicit email allowlist; this application-level control is not an independent security certification or a complete financial-services security program.',
    },
    {
      id: 'ssl-tls',
      title: 'SSL/TLS encryption',
      icon: LockKeyhole,
      text: 'The public site was reachable over HTTPS on 15 October 2026. A public TLS endpoint scan on that date reported TLS 1.2 and TLS 1.3 support and a trusted certificate for globalmarketoptions.org issued by Let’s Encrypt. The certificate is domain-validated (DV), not Extended Validation (EV); its observed validity period was 15 October 2026 through 13 January 2027. Certificate renewal and future validity should be rechecked.',
      detail: 'The scan observed AES-128-GCM, AES-256-GCM and ChaCha20-Poly1305 cipher suites among the supported options. The protocol and cipher are negotiated separately for each connection. Therefore this site does not claim that every connection uses 256-bit encryption. AES-256-GCM applies only when that cipher is actually negotiated. The scan reported no HSTS policy. HTTPS protects data in transit for a correctly validated connection; it does not secure a compromised device or make a business offer trustworthy.',
    },
    {
      id: 'certificate-identity',
      title: 'Certificate identity verification',
      icon: BadgeCheck,
      text: 'A browser certificate view can show the certificate subject, issuer, validity dates and validation type where the browser exposes those details. The certificate observed for this domain is issued by Let’s Encrypt and validates control of the domain; it is not an EV certificate. Certificate validation does not establish financial-services authorisation, solvency, investment performance, regulatory approval or freedom from fraud.',
    },
    {
      id: 'account-security',
      title: 'Account security',
      icon: Fingerprint,
      text: 'The site offers passwordless email-link sign-in. The website does not collect or store passwords, and provider-managed sessions are used instead of a custom local-storage password flow. This sign-in identity does not create a funded brokerage account. MFA, login-risk monitoring, reauthentication for financial actions and role-restricted administration are not implemented or tested here. The owner must confirm authentication-provider processing terms and configure appropriate account safeguards before any customer financial service is launched.',
    },
    {
      id: 'fraud-monitoring',
      title: 'Anti-fraud and transaction monitoring',
      icon: TriangleAlert,
      text: 'The email-link sign-in flow establishes an application identity only. There are no real-money transactions, deposits, withdrawals, identity checks, payment screening or transaction-monitoring features connected to this frontend. Automated suspicious-login detection, unusual-activity review, security alerts and escalation procedures are not operational or tested. If financial services are considered later, appropriate risk controls and legally required identity verification must be designed with qualified providers and tested before launch.',
    },
    {
      id: 'data-privacy',
      title: 'Data privacy',
      icon: ClipboardCheck,
      text: 'Provider-managed email-link sign-in may process the email and profile details a visitor authorizes. After sign-in, the application stores email, display name, a simulated USD balance, account status, pending demo requests and a limited demo activity history to provide the account preview. It does not collect payment credentials, wallet addresses, private keys, identity documents or real trading instructions. The site requests fonts from Google Fonts, embeds Tawk.to live chat and loads a TradingView chart. These providers may receive connection or device/browser information. Their logging, retention, processing locations, contracts and transfer safeguards require owner review.',
      detail: 'The current demo account record contains a sign-in email, display name, simulated balance, account status, simulated deposit/withdrawal requests and short activity history. The purpose is to display the non-cash account preview and administer demo requests. Records are held in the AppDeploy application database; the company has not confirmed the provider retention period, hosting region, legal grounds, processor terms, international transfer safeguards or a deletion schedule. No identity documents or actual payment or trade data are collected. The Swiss Federal Act on Data Protection (FADP, SR 235.1) and Ordinance on Data Protection (DPO, SR 235.11) should be assessed where applicable; other laws depend on actual operations and customer locations.',
    },
    {
      id: 'storage-access',
      title: 'Data storage and access control',
      icon: Server,
      text: 'The application database stores limited demo account records and simulated requests/history. Account APIs scope a signed-in user to the record derived from their provider identity, while administrative account and ticket routes require the configured support@globalmarketoptions.org email allowlist. No payment credentials or identity files are stored. Encryption at rest, protected backups, detailed administrative audit logging, hosting access controls, security patching and vulnerability-management practices were not independently verified and remain owner/platform confirmation items.',
    },
    {
      id: 'third-party-security',
      title: 'Third-party and payment security',
      icon: KeyRound,
      text: 'The current frontend has no payment processor, identity-verification vendor, custody provider or exchange integration. Google Fonts is an external asset dependency, and the hosting platform provides application hosting and authentication; their contractual security terms and data-processing details have not been reviewed for this disclosure. No payment-security certification or third-party endorsement is claimed. Never disclose a banking password, card PIN, one-time banking code, cryptocurrency private key or wallet recovery phrase to anyone claiming to be support.',
    },
    {
      id: 'incident-response',
      title: 'Security incident response',
      icon: TriangleAlert,
      text: 'A response process should identify, investigate, contain, remediate and document incidents, then notify affected people and authorities where required by applicable law. No tested incident-response workflow or monitored security-reporting channel has been supplied or verified for this project. The site has no active customer accounts to report as compromised. Do not send passwords, recovery phrases or other secrets to the business address below. A security email or support route must be supplied and tested before account services launch.',
    },
    {
      id: 'regulatory-transparency',
      title: 'Compliance and regulatory transparency',
      icon: Shield,
      text: 'HTTPS encryption, domain identity validation, company registration, financial-services licensing and independent security certification are different things. The TLS certificate is not an EV certificate and does not confer financial authorisation. No official registration extract, licence, regulator confirmation, independent audit report or certification evidence was supplied for verification. This website makes no claim that the company is licensed, regulated, government-approved, independently audited, insured or certified. The owner must confirm the company’s legal entity, registration status and any applicable permissions before publishing such claims.',
    },
    {
      id: 'customer-responsibilities',
      title: 'Customer security responsibilities',
      icon: LockKeyhole,
      text: 'Use the verified official website address, keep devices and browsers updated, use a unique password for each service, enable MFA where it is offered, avoid unexpected links, and check payment or withdrawal details through a trusted channel. Report unusual activity promptly through a verified support route. HTTPS and browser security indicators alone do not prove that a business or investment offer is legitimate. No account or payment activity is available on this preview site.',
    },
    {
      id: 'security-contact',
      title: 'Security and privacy contact',
      icon: Globe2,
      text: 'No security email, privacy email or tested support form has been provided. The postal business address below was supplied by the company owner, but it has not been independently verified as a monitored security or privacy-request channel. A monitored reporting route must be confirmed before the site accepts customer accounts or personal information.',
    },
  ];
  return (
    <article className='security-page'>
      <div className='eyebrow'><span className='eyebrow-line' /> TRUST, SECURITY & TRANSPARENCY</div>
      <h1>EV SSL Security &amp; Compliance Disclosure</h1>
      <p className='inner-lede'>A transparent summary of the public site’s observed TLS configuration, current product limitations and security requirements.</p>
      <div className='security-meta'><span><b>Last updated</b> 15 October 2026</span><span><b>Business</b> Global Marketoptions Company</span></div>
      <div className='security-status' role='note'>
        <span className='security-status-icon'><ShieldCheck size={20}/></span>
        <div><b>What was verified</b><p>On 15 October 2026, a public endpoint scan observed a trusted Let’s Encrypt domain-validated certificate and TLS 1.2/1.3. It did not find an HSTS policy. The certificate is not EV. Supported cipher suites vary by connection; not every connection uses AES-256.</p></div>
      </div>
      <nav className='security-toc' aria-label='Disclosure sections'>
        <b>On this page</b>
        <div>{sections.map((section,index)=><button type='button' key={section.id} onClick={()=>document.getElementById(section.id)?.scrollIntoView({behavior:'smooth'})}>{String(index+1).padStart(2,'0')} {section.title}</button>)}</div>
      </nav>
      <div className='security-sections'>
        {sections.map((section,index)=>{
          const Icon=section.icon;
          return <section className='security-section' id={section.id} aria-labelledby={section.id+'-heading'} key={section.id}>
            <div className='security-section-heading'><span className='security-icon'><Icon size={19}/></span><div><span className='security-index'>SECTION {String(index+1).padStart(2,'0')}</span><h2 id={section.id+'-heading'}>{section.title}</h2></div></div>
            <p>{section.text}</p>
            {section.detail&&<p>{section.detail}</p>}
            {section.id==='security-contact'&&<address className='business-address'><b>Global Marketoptions Company</b><br/>Gotthardstrasse 26<br/>6300 Zug<br/>Switzerland</address>}
          </section>
        })}
      </div>
      <div className='security-footnote'>This disclosure describes the public frontend and one point-in-time TLS scan. It is not a security certification, legal opinion, or assurance about unreviewed hosting infrastructure.</div>
    </article>
  );
}
function PrivacyPolicy() {
  return (
    <article className='security-page privacy-page'>
      <div className='eyebrow'><span className='eyebrow-line' /> PRIVACY INFORMATION</div>
      <h1>Privacy Policy</h1>
      <p className='inner-lede'>What the current public website does, what remains unknown about its providers, and what must be confirmed before customer accounts are introduced.</p>
      <div className='security-meta'><span><b>Last updated</b> 15 October 2026</span><span><b>Business</b> Global Marketoptions Company</span></div>
      <section className='security-section'><div className='security-section-heading'><span className='security-icon'><ClipboardCheck size={19}/></span><div><span className='security-index'>CURRENT SITE</span><h2>Information processed by this preview</h2></div></div>
        <p>This site offers provider-managed email-link sign-in. If a visitor signs in, the identity provider processes the email and profile information requested during that flow; the site does not receive or store a password. After sign-in, the application stores the email, display name, zero-initialized simulated USD balance, account status, demo deposit or withdrawal requests, and limited simulated activity history in the AppDeploy application database. This is a non-cash preview and does not create a funded trading account. The site does not collect payment credentials, wallet addresses, identity documents or real trading instructions.</p>
        <p>The site requests fonts from Google Fonts, embeds Tawk.to live chat across pages, and loads a TradingView market chart on the dashboard. Those services may receive connection or device/browser information when a page or widget loads or is used. The hosting platform also provides authentication infrastructure. Provider logging, retention, processing locations, contracts, controller/processor roles and international transfer safeguards have not been confirmed by the company owner. Visitors can avoid optional dashboard widgets by not opening or interacting with them; the Tawk.to embed is loaded site-wide.</p>
      </section>
      <section className='security-section'><div className='security-section-heading'><span className='security-icon'><Server size={19}/></span><div><span className='security-index'>FUTURE SERVICES</span><h2>Data categories, purposes and retention</h2></div></div>
        <p>Signed-in visitors have a limited demo account record containing email, display name, simulated USD balance, account status, demo requests and a short activity history. These details are used to display and administer the preview. The application does not accept real deposits, process payouts, collect identity documents or execute trades. The company has not confirmed provider retention periods, hosting locations, legal grounds, recipient contracts, deletion schedules or transfer safeguards.</p>
        <p>Before enabling real payment, identity-verification or financial services, the company must establish and publish the exact purposes, legal grounds, retention, authorised recipients, processor terms, privacy rights procedures and security controls. The features on this page remain simulations only.</p>
      </section>
      <section className='security-section'><div className='security-section-heading'><span className='security-icon'><Globe2 size={19}/></span><div><span className='security-index'>APPLICABLE LAW</span><h2>Privacy rights and legal framework</h2></div></div>
        <p>The Swiss Federal Act on Data Protection (FADP, SR 235.1) and its implementing Ordinance on Data Protection (DPO, SR 235.11) may apply depending on the company’s role and actual processing. Other privacy laws, including those in places where services are offered or people are targeted, require a separate applicability assessment. Rights and remedies depend on the law that applies to the particular processing.</p>
        <p>The company has not provided a designated privacy contact, confirmed controller identity, or established a procedure for access, correction, deletion or other requests. The supplied support email is displayed on the site but has not been tested as a privacy-request channel. The address below was supplied for the company but is not verified as a monitored privacy-request channel.</p>
      </section>
      <section className='security-section'><div className='security-section-heading'><span className='security-icon'><ShieldCheck size={19}/></span><div><span className='security-index'>CONTACT DETAILS</span><h2>Business address</h2></div></div>
        <address className='business-address'><b>Global Marketoptions Company</b><br/>Gotthardstrasse 26<br/>6300 Zug<br/>Switzerland</address>
        <p>Before collecting more than the basic identity information handled by the sign-in provider, the company must publish a verified privacy contact and confirm controller details, purposes, lawful basis where required, recipients, transfer safeguards, retention and rights procedures.</p>
      </section>
      <p className='security-footnote'>This policy describes the visible website features as of 15 October 2026. Provider terms, data retention, processing locations and transfer safeguards remain unverified; this disclosure is not confirmation that privacy compliance requirements have been met.</p>
    </article>
  );
}
function SupportAdmin({ user, authReady, onSignIn }: { user: AuthUser | null; authReady: boolean; onSignIn: () => void }) {
  const [tickets, setTickets] = useState<Array<{ id: string; name: string; email: string; subject: string; message: string; createdAt: string; deliveryStatus?: Record<string, string>; emailMessageId?: string }>>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [cursor, setCursor] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    const query = cursor ? '&nextToken=' + encodeURIComponent(cursor) : '';
    api.get('/api/admin/support-tickets?limit=25' + query).then(({ data }) => {
      if (!active) return;
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setNextToken(typeof data?.nextToken === 'string' ? data.nextToken : null);
    }).catch((cause: unknown) => {
      if (active) setLoadError(cause instanceof Error && /403/.test(cause.message) ? 'This signed-in account is not on the support admin allowlist.' : cause instanceof Error && /401/.test(cause.message) ? 'Sign in with the approved support admin account to view ticket history.' : 'Ticket history could not be loaded. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authReady, user, cursor]);
  if (!authReady) return <section className='support-admin portal-card'><h1>Support ticket history</h1><p>Checking sign-in status…</p></section>;
  if (!user) return <section className='support-admin portal-card'><span className='dashboard-card-kicker'>RESTRICTED AREA</span><h1>Support ticket history</h1><p>Sign in with the approved support admin account to continue.</p><button className='primary' onClick={onSignIn}>Sign in</button></section>;
  return <section className='support-admin portal-card'><div className='support-admin-heading'><div><span className='dashboard-card-kicker'>PRIVATE ADMIN VIEW</span><h1>Support ticket history</h1><p>Resend acceptance and delivery events are shown per recipient when webhook delivery tracking is configured.</p></div><button className='secondary' type='button' onClick={() => setCursor('')}>Refresh</button></div>{loadError && <p className='support-form-error' role='alert'>{loadError}</p>}{loading ? <p role='status'>Loading ticket history…</p> : tickets.length === 0 && !loadError ? <p>No support tickets are available on this page yet.</p> : <div className='support-admin-list'>{tickets.map(ticket => <article className='support-admin-ticket' key={ticket.id}><header><div><span className='dashboard-card-kicker'>{new Date(ticket.createdAt).toLocaleString()}</span><h2>{ticket.subject}</h2></div><span className='support-admin-status'>{ticket.emailMessageId ? 'Resend accepted' : 'Archived'}</span></header><div className='support-admin-contact'><b>{ticket.name}</b><a href={'mailto:' + ticket.email}>{ticket.email}</a></div><details><summary>View ticket message</summary><p>{ticket.message}</p></details><div className='support-delivery-status'>{['support@globalmarketoptions.org','info@globalmarketoptions.org'].map(address => <span key={address}><b>{address}</b><small>{ticket.deliveryStatus?.[address] || 'Status pending'}</small></span>)}</div></article>)}</div>}{nextToken && <button className='secondary support-admin-next' type='button' disabled={loading} onClick={() => setCursor(nextToken)}>Load next page</button>}</section>;
}

function SupportContactForm() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const ticket = {
      name: String(data.get('name') || '').trim(),
      email: String(data.get('email') || '').trim(),
      subject: String(data.get('subject') || '').trim(),
      message: String(data.get('message') || '').trim(),
      website: String(data.get('website') || '').trim(),
    };
    if (!ticket.name || !ticket.email || !ticket.subject || !ticket.message) {
      setFormError('Complete every field before submitting.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/api/support-tickets', ticket);
      form.reset();
      setShowConfirmation(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      if (/429/.test(message)) {
        setFormError('Too many support tickets were submitted. Please wait 15 minutes before trying again.');
      } else if (/401/.test(message)) {
        setFormError('Resend rejected the API key. Check that it is active and stored correctly.');
      } else if (/403|422/.test(message)) {
        setFormError('Resend rejected the sender. Verify globalmarketoptions.org in Resend and confirm the support sender address.');
      } else if (/Resend did not accept/.test(message)) {
        setFormError(message);
      } else {
        setFormError('We could not send your ticket right now. Please try again or email support@globalmarketoptions.org.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className='portal-card support-form-card'>
      <h2>Submit a Support Ticket</h2>
      <p>Our dedicated support team is available 24/7 to assist with your trading account, technical inquiries, and verification.</p>
      <form onSubmit={submit}>
        <div className='support-trap' aria-hidden='true'><label>Leave this field blank<input name='website' tabIndex={-1} autoComplete='off' /></label></div>
        <label className='portal-field'>Full name<input name='name' autoComplete='name' maxLength={120} required /></label>
        <label className='portal-field'>Email address<input name='email' type='email' autoComplete='email' maxLength={254} required /></label>
        <label className='portal-field'>Subject<input name='subject' maxLength={180} required /></label>
        <label className='portal-field'>Message<textarea name='message' rows={5} maxLength={5000} required /></label>
        {formError && <p className='support-form-error' role='alert'>{formError}</p>}
        <button className='primary' type='submit' disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Ticket'}</button>
      </form>
      {showConfirmation && (
        <div className='support-confirmation-backdrop' role='presentation'>
          <section className='support-confirmation' role='dialog' aria-modal='true' aria-labelledby='support-confirmation-title'>
            <button className='support-confirmation-close' type='button' aria-label='Close confirmation' onClick={() => setShowConfirmation(false)}>×</button>
            <span className='dashboard-card-kicker'>SUPPORT MESSAGE</span>
            <h3 id='support-confirmation-title'>Ticket received</h3>
            <p>Thank you! Your ticket has been logged. Our support team will respond within 24 hours.</p>
            <div className='support-confirmation-actions'>
              <button type='button' className='primary' onClick={() => setShowConfirmation(false)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}


function PublicPage({ route, title, go, faqOpen, setFaqOpen }) {
  const contents = {
    about: [
      'A more considered market experience',
      'Global markets can feel complex. Our aim is to make the experience of exploring them clearer, more approachable, and grounded in honest information.',
      'We are building a digital platform concept around thoughtful design and transparent communication. This initial release is an informational preview; it does not provide brokerage, custody, advice, or real-money services.',
    ],
    markets: [
      'A world of markets to explore',
      'Discover the different asset classes that shape the global financial landscape.',
      'Browse the categories below to learn more. Instrument names are for navigation only and do not represent live quotes or an offer to trade.',
    ],
    crypto: [
      'Digital assets, explained',
      'Explore the foundations and vocabulary of digital asset markets.',
      'Digital assets can be volatile and involve substantial risk. This page is educational and does not enable crypto purchases, custody, or trading.',
    ],
    forex: [
      'Foreign exchange, in context',
      'Learn how currency pairs and the global FX market are commonly described.',
      'Foreign exchange trading can involve leverage and substantial losses. This page is educational and does not provide execution or market prices.',
    ],
    stocks: [
      'Company shares and exchange-traded funds',
      'Learn about listed companies, broad indices, and exchange-traded funds.',
      'Examples on this page are illustrative and do not represent investment recommendations or live market data.',
    ],
    'copy-trading': [
      'Explore strategy concepts',
      'Understand how copy trading is commonly presented and the risks that come with it.',
      'This is an illustrative overview only. No real traders, performance data, copy execution, or automated investment services are available.',
    ],
    portfolios: [
      'A starting point for portfolio ideas',
      'Explore how asset allocation and investment themes are often discussed.',
      'Any examples are educational concepts, not recommendations or historical performance. No portfolio management or automated execution is available.',
    ],
    fees: [
      'Understand costs before you act',
      'A transparent fee schedule matters. No trading or payment services are active in this release.',
      'There are no real-money deposits, withdrawals, orders, custody, or brokerage transactions in this initial experience. Fees for any future service will be published before launch.',
    ],
    help: [
      'A helpful place to start',
      'Find clear answers about this platform preview and the topics it covers.',
      'This initial site is informational. Account features, live market data, and financial services are not available yet.',
    ],
    contact: [
      'We welcome your questions',
      'For support, use the public company email channels below. Do not send passwords, payment credentials or identity documents.',
      '',
    ],
    faqs: [
      'Frequently asked questions',
      'Straightforward answers about what this initial platform preview does and does not offer.',
      '',
    ],
  };
  const c = contents[route];
  if (route === 'faqs')
    return (
      <div className="content-page">
        <div className="eyebrow">
          <span className="eyebrow-line" /> HELP & INFORMATION
        </div>
        <h1>{c[0]}</h1>
        <p className="inner-lede">{c[1]}</p>
        <div className="faq-list">
          {[
            [
              'Can I open an account?',
              'Account registration and login are not active in this initial release. The account buttons explain this limitation without collecting your information.',
            ],
            [
              'Are these live prices?',
              'No. The graphics and instrument names are illustrative. No live prices or fabricated performance data are shown.',
            ],
            [
              'Can I deposit or withdraw money?',
              'No. Deposits, withdrawals, custody, and all real-money activity are unavailable.',
            ],
            [
              'Is copy trading enabled?',
              'No. Copy-trading and automated execution are not active. The page provides general educational context only.',
            ],
            [
              'Is this company licensed or regulated?',
              'This website makes no claim of licensing, regulatory approval, or insurance. Please independently verify any provider before considering financial services.',
            ],
          ].map(([q, a], i) => (
            <div className={'faq ' + (faqOpen === i ? 'expanded' : '')} key={q}>
              <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                <span>{q}</span>
                <ChevronDown size={18} />
              </button>
              {faqOpen === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="content-page">
      <div className="eyebrow">
        <span className="eyebrow-line" />{' '}
        {route === 'markets'
          ? 'GLOBAL MARKETS'
          : 'GLOBAL MARKET OPTIONS COMPANY'}
      </div>
      <h1>{c?.[0] || title}</h1>
      <p className="inner-lede">{c?.[1]}</p>
      {route === 'contact' && (
        <div className="contact-direct-links" aria-label="Official contact information">
          <div className="contact-info-card"><b>Support Email</b><p><a href="mailto:support@globalmarketoptions.org">support@globalmarketoptions.org</a></p></div>
          <div className="contact-info-card"><b>General Inquiries</b><p><a href="mailto:info@globalmarketoptions.org">info@globalmarketoptions.org</a></p></div>
          <div className="contact-info-card"><b>Registered Office</b><p>Gotthardstrasse 26<br />6300 Zug, Switzerland</p></div>
          <div className="contact-info-card"><b>Company Reg No.</b><p>00258922</p></div>
        </div>
      )}
      {c?.[2] && (
        <div className="content-intro">
          <p>{c[2]}</p>
        </div>
      )}
      {route === 'contact' && <SupportContactForm />}
      {route === 'about' && (
        <section className="security-section certificate-panel" aria-labelledby="company-information-title">
          <div className="eyebrow"><span className="eyebrow-line" /> COMPANY INFORMATION</div>
          <h2 id="company-information-title">Company information</h2>
          <p><strong>Founded: 07 February 2005</strong></p>
          <p><strong>Company name:</strong> Global Market Options Company</p>
          <p><strong>Company number stated on the supplied Certificate of Appreciation:</strong> 00258922</p>
          <address className="business-address">Gotthardstrasse 26<br />6300 Zug<br />Switzerland</address>
          <p>These company details were supplied for publication and have not been independently checked against an official register. The supplied document is a Certificate of Appreciation; it is not presented as a registration certificate or proof of financial authorisation, licensing or regulatory approval.</p>
          <div className="security-section-heading">
            <span className="security-icon"><BadgeCheck size={19} /></span>
            <div>
              <span className="security-index">COMPANY DOCUMENT</span>
              <h2>Company Information &amp; Certificate of Appreciation</h2>
            </div>
          </div>
          <CertificateViewer />
        </section>
      )}
      {['markets', 'crypto', 'forex', 'stocks'].includes(route) && (
        <div className="asset-grid inner-assets">
          {instruments
            .filter(
              x =>
                route === 'markets' ||
                (route === 'crypto'
                  ? x.type === 'Crypto'
                  : route === 'forex'
                    ? x.type === 'Forex'
                    : x.type === 'Stocks')
            )
            .map(x => (
              <div className="asset-card static" key={x.symbol}>
                <span className={'asset-icon ' + x.tone}>{x.icon}</span>
                <span className="asset-info">
                  <b>{x.name}</b>
                  <small>
                    {x.type} <i /> {x.symbol}
                  </small>
                </span>
                <span className="asset-go">
                  <ArrowUpRight size={17} />
                </span>
              </div>
            ))}
        </div>
      )}
      {route === 'copy-trading' && (
        <div className="demo-label">
          <Sparkles size={17} />
          <div>
            <b>Illustrative concept</b>
            <span>
              Sample strategy cards and performance displays are not included
              because no verified trader or historical data source is connected.
            </span>
          </div>
        </div>
      )}
      {route === 'portfolios' && (
        <div className="value-grid inner-values">
          {[
            ['Broad market', 'Diversification concepts'],
            ['Innovation themes', 'Sector education'],
            ['Risk awareness', 'Understand trade-offs'],
          ].map(([a, b]) => (
            <div key={a}>
              <span className="value-icon">
                <BarChart3 />
              </span>
              <h3>{a}</h3>
              <p>{b}</p>
            </div>
          ))}
        </div>
      )}
      {route === 'help' && (
        <button className="primary" onClick={() => go('faqs')}>
          Browse FAQs <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function AuthPage(props: any) {
  return <DemoAuthForm {...props} />;
}
function TradingViewChart({ symbol, timeframe = '1D' }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    container.innerHTML = '';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    const link = document.createElement('a');
    link.href = 'https://www.tradingview.com/symbols/NASDAQ-AAPL/';
    link.target = '_blank';
    link.rel = 'noopener nofollow';
    link.textContent = 'AAPL stock chart by TradingView';
    copyright.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.type = 'text/javascript';
    const intervals: Record<string, string> = { '1D': 'D', '1M': 'M', '3M': '3M', '1Y': '12M', '5Y': '60M', All: 'D' };
    script.text = JSON.stringify({ autosize: true, symbol, interval: intervals[timeframe] || 'D', timezone: 'Etc/UTC', theme: 'light', style: '1', locale: 'en', allow_symbol_change: true, hide_side_toolbar: true, hide_top_toolbar: false, hide_legend: false, hide_volume: false, calendar: false, details: false, hotlist: false, save_image: true, withdateranges: false, watchlist: [], compareSymbols: [], studies: [], support_host: 'https://www.tradingview.com', backgroundColor: '#ffffff', gridColor: 'rgba(46, 46, 46, 0.2)' });
    container.append(widget, copyright, script);
    return () => { container.innerHTML = ''; };
  }, [symbol, timeframe]);
  return <div className="portal-chart"><div className="tradingview-widget-container" ref={host} aria-label="TradingView chart; external market data availability varies" /></div>;
}
function ClientDashboard(props: any) {
  return <DemoTradingDesk {...props} Chart={TradingViewChart} />;
}

function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <Logo />
            <p>An informational platform preview designed around clarity and responsible exploration.</p>
            <address className="footer-address">Gotthardstrasse 26<br/>6300 Zug, Switzerland</address>
            <a className="footer-email" href="mailto:support@globalmarketoptions.org">support@globalmarketoptions.org</a><br/>
            <a className="footer-email" href="mailto:info@globalmarketoptions.org">info@globalmarketoptions.org</a>
            <div className="footer-company-details">
              <p><b>Global Market Options Company</b></p>
              <p>Founded: 07 February 2005</p>
              <p>Company number stated on supplied Certificate of Appreciation: 00258922</p>
              <p>Company details supplied for publication; not independently checked against an official register.</p>
              <a className="certificate-verify-link" href="#/about#certificate"><BadgeCheck size={16}/> Verify Certificate / Company Registration</a>
              <small>Company details and document displayed as supplied; not independently verified.</small>
            </div>
          </div>
          <div className="footer-col">
            <b>Explore</b>
            {[
              'About Us',
              'Markets',
              'Crypto',
              'Forex',
              'Stocks and ETFs',
              'Copy Trading',
              'Smart Portfolios',
            ].map(n => (
              <a key={n} href={'#/' + slugs[n]}>
                {n}
              </a>
            ))}
          </div>
          <div className="footer-col">
            <b>Information</b>
            {['Fees', 'Help Centre', 'Contact', 'FAQs'].map(n => (
              <a key={n} href={'#/' + slugs[n]}>
                {n}
              </a>
            ))}
            <a href='#/admin/accounts'>Account management</a>
            <a href='#/admin/tickets'>Support ticket admin</a>
          </div>
          <div className="footer-col">
            <b>Legal</b>
            {[
              ['Terms of Service', 'terms'],
              ['Privacy Policy', 'privacy'],
              ['Cookie Policy', 'cookies'],
              ['Risk Disclosure', 'risk'],
              ['Security & Compliance', 'security'],
            ].map(([n, s]) => (
              <a key={s} href={'#/' + s}>
                {n}
              </a>
            ))}
          </div>
        </div>
        <div className="risk-strip">
          <Shield size={16} />
          <span>
            <b>Risk warning</b> — Trading involves risk and may not be suitable
            for everyone. You may lose some or all of your invested capital.
            This site provides no financial advice or real-money services.
          </span>
        </div>
        <div className="footer-bottom">
          <span>© 2005 Global Market Options Company</span>
          <span>Informational preview · No live trading</span>
        </div>
      </div>
    </footer>
  );
}
export default App;
