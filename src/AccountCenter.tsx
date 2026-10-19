import { useEffect, useRef, useState } from 'react';
import { api, ws } from '@appdeploy/client';

const depositMethods = [
  { id: 'BTC', name: 'Bitcoin', network: 'Bitcoin network', address: import.meta.env.VITE_DEPOSIT_BTC_ADDRESS || '' },
  { id: 'ETH', name: 'Ethereum', network: 'Ethereum (ERC-20 native ETH)', address: import.meta.env.VITE_DEPOSIT_ETH_ADDRESS || '' },
  { id: 'USDT-ERC20', name: 'Tether (USDT)', network: 'Ethereum / ERC-20', address: import.meta.env.VITE_DEPOSIT_USDT_ERC20_ADDRESS || '' },
  { id: 'USDT-TRC20', name: 'Tether (USDT)', network: 'Tron / TRC-20', address: import.meta.env.VITE_DEPOSIT_USDT_TRC20_ADDRESS || '' },
] as const;

type AccountRequest = {
  id: string;
  kind: 'deposit' | 'withdrawal';
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};
type AccountHistory = {
  id: string;
  kind: string;
  amountCents?: number;
  description: string;
  createdAt: string;
};
type ClientAccount = {
  id: string;
  email: string;
  name: string;
  balanceCents: number;
  reservedCents: number;
  status: 'active' | 'restricted';
  verificationStatus: 'not_configured';
  dailyLimitPercent: null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  requests: AccountRequest[];
  history: AccountHistory[];
};
type AccountPanelProps = {
  user: { userId?: string; email?: string; name?: string } | null;
  authReady: boolean;
  onSignIn: () => void;
};
type AdminAccount = ClientAccount;

function dollars(cents: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}
function requestId(prefix: string) {
  return prefix + crypto.randomUUID().replace(/-/g, '');
}

export function AccountWalletPanel({ user, authReady, onSignIn }: AccountPanelProps) {
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [tab, setTab] = useState<'wallet' | 'liquidity' | 'history'>('wallet');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<string>('BTC');
  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);
  const connectionRef = useRef<ReturnType<typeof ws.connect> | null>(null);

  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    let subscribed = false;
    let connection: ReturnType<typeof ws.connect> | null = null;
    setLoading(true);
    setErrorMessage('');

    api.get('/api/client-account').then(({ data }) => {
      if (!active) return;
      setAccount(data.account as ClientAccount);
      connection = ws.connect();
      connectionRef.current = connection;
      connection.onMessage((message: unknown) => {
        const update = message as { type?: string; payload?: { entity_type?: string; data?: ClientAccount } };
        if (update?.type !== 'entity.update' || update.payload?.entity_type !== 'client_account' || !update.payload.data) return;
        setAccount(update.payload.data);
        setNotice('Your demo account was updated.');
        window.setTimeout(() => setNotice(''), 5000);
      });
      connection.ready.then(async () => {
        if (!active || !connection?.connectionId) return;
        await api.post('/api/client-account/subscribe', { connection_id: connection.connectionId });
        subscribed = true;
      }).catch(() => {
        if (active) setErrorMessage('Live updates are unavailable. Refresh this page to check the latest account state.');
      });
    }).catch(() => {
      if (active) setErrorMessage('Your demo wallet could not be loaded. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      if (connection?.connectionId && subscribed) {
        void api.post('/api/client-account/unsubscribe', { connection_id: connection.connectionId }).catch(() => {});
      }
      connection?.disconnect();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [authReady, user?.userId]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>, kind: 'deposit' | 'withdrawal') {
    event.preventDefault();
    if (!user || !account || loading) return;
    const value = Number(kind === 'deposit' ? depositAmount : withdrawalAmount);
    if (!Number.isFinite(value) || value <= 0 || value > 1000000) {
      setErrorMessage('Enter a demo request between $0.01 and $1,000,000.');
      return;
    }
    if (kind === 'withdrawal' && Math.round(value * 100) > account.balanceCents - account.reservedCents) {
      setErrorMessage('The request exceeds your available demo balance.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const { data } = await api.post('/api/client-account/requests', {
        kind,
        amount: value,
        request_id: requestId('req_'),
      });
      setAccount(data.account as ClientAccount);
      if (kind === 'deposit') setDepositAmount(''); else setWithdrawalAmount('');
      setNotice(kind === 'deposit' ? 'Simulated deposit request submitted for admin review.' : 'Simulated withdrawal request submitted for admin review.');
      window.setTimeout(() => setNotice(''), 5000);
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'The demo request could not be submitted.');
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) return <section className='account-wallet-panel portal-card'><p>Checking sign-in status…</p></section>;
  if (!user) return <section className='account-wallet-panel portal-card'><span className='dashboard-card-kicker'>CLIENT WALLET</span><h2>Sign in to view your wallet</h2><p>Sign in to view your account summary. Wallet funding is not enabled until a verified payment provider is connected.</p><button className='primary' type='button' onClick={onSignIn}>Sign in</button></section>;

  const available = account ? account.balanceCents - account.reservedCents : 0;
  return (
    <section className='account-wallet-panel'>
      <div className='account-wallet-heading'>
        <div><span className='dashboard-card-kicker'>CLIENT WALLET</span><h2>Wallet Dashboard</h2><p>You are logged in as <b>{account?.email || user.email}</b>.</p></div>
        <span className='demo-pill'>FUNDING NOT CONNECTED</span>
      </div>
      {notice && <div className='account-wallet-toast' role='status' aria-live='polite'>{notice}</div>}
      {topUpOpen && <div className='desk-modal-backdrop' role='presentation' onMouseDown={event => { if (event.target === event.currentTarget) setTopUpOpen(false); }}><section className='desk-modal' role='dialog' aria-modal='true' aria-labelledby='wallet-topup-title'><div className='dashboard-section-heading'><div><span className='dashboard-card-kicker'>WALLET FUNDING</span><h2 id='wallet-topup-title'>Top Up</h2></div><button className='dashboard-icon-button' type='button' aria-label='Close top up modal' onClick={() => setTopUpOpen(false)}>×</button></div><p className='deposit-intro'>Choose the asset and network you intend to use. Only send funds to an address that has been configured and independently confirmed by the site operator.</p>
          <div className='deposit-method-tabs' role='tablist' aria-label='Deposit asset and network'>
            {depositMethods.map(method => <button key={method.id} type='button' role='tab' aria-selected={selectedDepositMethod === method.id} className={selectedDepositMethod === method.id ? 'active' : ''} onClick={() => { setSelectedDepositMethod(method.id); setCopiedDepositAddress(false); }}>
              <b>{method.id.startsWith('USDT') ? 'USDT' : method.id}</b><span>{method.network}</span>
            </button>)}
          </div>
          {(() => {
            const method = depositMethods.find(item => item.id === selectedDepositMethod) || depositMethods[0];
            return <div className='deposit-address-panel'>
              <div className='deposit-address-heading'><div><span className='dashboard-card-kicker'>{method.name}</span><h3>{method.network}</h3></div><span className={method.address ? 'deposit-configured' : 'deposit-unavailable'}>{method.address ? 'Address configured' : 'Address unavailable'}</span></div>
              {method.address ? <>
                <label className='deposit-address-label' htmlFor='wallet-deposit-address'>Deposit address</label>
                <div className='deposit-address-copy-row'><code id='wallet-deposit-address'>{method.address}</code><button type='button' className='desk-primary' onClick={async () => { try { await navigator.clipboard.writeText(method.address); setCopiedDepositAddress(true); setNotice('Deposit address copied.'); } catch { setCopiedDepositAddress(false); setErrorMessage('Clipboard access was blocked. Please copy the address manually.'); } }}> {copiedDepositAddress ? 'Copied ✓' : 'Copy address'} </button></div>
                <p className='deposit-network-warning'>Send only {method.name} on the {method.network} network to this address. Sending another asset or using a different network may result in permanent loss.</p>
              </> : <p className='deposit-unavailable-copy'>A deposit address has not been configured for this asset and network. Do not send funds. Contact support to confirm the correct details.</p>}
            </div>;
          })()}
          <section className='deposit-guidelines'><h3>Before you transfer</h3><ol>
            <li>Confirm the asset and network match the sending wallet exactly.</li>
            <li>Verify the full address with an authorized support channel before sending. Start with a small test transfer if appropriate.</li>
            <li>Keep your transaction ID (TXID), amount, asset, network and transfer time for your records.</li>
            <li>Do not share your wallet seed phrase or private keys with anyone.</li>
          </ol></section>
          <p className='deposit-review-notice'>Deposit submission and automated payment confirmation are not connected in this preview. Copying an address does not submit a deposit or change your wallet balance. Any transfer must be confirmed separately before a balance is updated.</p>
          <div className='desk-modal-actions'><button className='desk-primary' type='button' onClick={() => setTopUpOpen(false)}>Close</button></div></section></div>}
      {errorMessage && <p className='support-form-error' role='alert'>{errorMessage}</p>}
      <div className='account-status-banner'><b>Account status: {account?.status || 'loading'}</b><span>Wallet funding and payment processing are not connected. No deposit or withdrawal can be completed from this page.</span></div>
      {loading && !account ? <p role='status'>Loading account…</p> : account && <>
        <div className='account-balance-grid'>
          <article><small>Total Balance</small><b>{dollars(account.balanceCents)}</b><span>Current account ledger balance</span></article>
          <article><small>Deposited</small><b>$0.00</b><span>Confirmed deposits recorded</span></article>
          <article><small>Daily Percentage Limit</small><b>Not configured</b><span>Limits require account configuration</span></article>
        </div>
        <div className='account-wallet-primary-action'><button className='desk-primary' type='button' onClick={() => setTopUpOpen(true)}>+ Top Up</button></div>
        <nav className='account-wallet-tabs' aria-label='Wallet sections'>
          <button type='button' className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}>Wallet</button>
          <button type='button' className={tab === 'liquidity' ? 'active' : ''} onClick={() => setTab('liquidity')}>Liquidity</button>
          <button type='button' className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Trade History</button>
        </nav>
        {tab === 'wallet' && <>
          <div className='account-wallet-actions'>
            <section className='account-request-card'><h3>Top Up</h3><p>Open the funding panel to review available next steps. No payment will be taken on this page.</p><button className='desk-primary' type='button' onClick={() => setTopUpOpen(true)}>+ Top Up</button></section>
            <section className='account-request-card'><h3>Deposited Summary</h3><p>Confirmed deposit activity will appear here after a verified payment provider is connected.</p><strong>$0.00 deposited</strong></section>
          </div>
          <div className='account-request-list'><h3>Recent requests</h3>{account.requests.slice(0, 10).map(request => <div className='account-history-row' key={request.id}><span>{request.kind === 'deposit' ? 'Demo deposit' : 'Demo withdrawal'}<small>{new Date(request.createdAt).toLocaleString()}</small></span><b>{dollars(request.amountCents)}</b><em>{request.status}</em></div>)}{!account.requests.length && <p>No demo requests yet.</p>}</div>
        </>}
        {tab === 'liquidity' && <div className='account-liquidity'><h3>Liquidity</h3><p>No liquidity provider or live trading pool is connected to this demo. This section is informational and does not represent available funds or executable liquidity.</p></div>}
        {tab === 'history' && <div className='account-request-list'><h3>Trade & account history</h3>{account.history.map(entry => <div className='account-history-row' key={entry.id}><span>{entry.kind}<small>{entry.description} · {new Date(entry.createdAt).toLocaleString()}</small></span><b>{entry.amountCents === undefined ? '—' : dollars(entry.amountCents)}</b></div>)}{!account.history.length && <p>No account activity yet.</p>}</div>}
        <div className='account-verification-note'><b>Identity verification is not configured</b><span>This demo does not collect identity documents or represent a completed KYC review.</span></div>
      </>}
    </section>
  );
}

export function AdminAccounts({ user, authReady, onSignIn }: AccountPanelProps) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [cursor, setCursor] = useState('');
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [amount, setAmount] = useState('25');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!authReady || !user) return;
    let active = true;
    setLoading(true);
    setErrorMessage('');
    api.get('/api/admin/client-accounts?limit=25' + (cursor ? '&nextToken=' + encodeURIComponent(cursor) : ''))
      .then(({ data }) => {
        if (!active) return;
        setAccounts(Array.isArray(data.accounts) ? data.accounts as AdminAccount[] : []);
        setNextToken(typeof data.nextToken === 'string' ? data.nextToken : null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setErrorMessage(cause instanceof Error && /403/.test(cause.message) ? 'This signed-in account is not on the approved admin allowlist.' : 'The account list could not be loaded. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authReady, user?.userId, cursor, refreshCount]);

  async function perform(account: AdminAccount, action: string, extra: Record<string, unknown> = {}) {
    setBusyId(account.id);
    setErrorMessage('');
    try {
      const { data } = await api.post('/api/admin/client-accounts/' + encodeURIComponent(account.id) + '/action', {
        action,
        action_id: requestId('act_'),
        amount: Number(amount),
        note: note.trim(),
        ...extra,
      });
      if (data.account) setAccounts(current => current.map(item => item.id === account.id ? data.account as AdminAccount : item));
      setNotice('Demo account update saved.');
      setNote('');
      window.setTimeout(() => setNotice(''), 4000);
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'The account update could not be saved.');
    } finally {
      setBusyId('');
    }
  }

  if (!authReady) return <section className='account-admin portal-card'><p>Checking sign-in status…</p></section>;
  if (!user) return <section className='account-admin portal-card'><span className='dashboard-card-kicker'>RESTRICTED ADMIN VIEW</span><h1>Account management</h1><p>Sign in with the approved administrator account to continue.</p><button className='primary' onClick={onSignIn}>Sign in</button></section>;

  return (
    <section className='account-admin portal-card'>
      <div className='account-admin-heading'><div><span className='dashboard-card-kicker'>PRIVATE · DEMO CONTROL MODE</span><h1>Account management</h1><p>Only users who have signed in appear here. All balance actions change simulated USD values only; no payments or payouts are processed.</p></div><button className='secondary' type='button' onClick={() => setRefreshCount(value => value + 1)}>Refresh</button></div>
      {notice && <div className='account-wallet-toast' role='status'>{notice}</div>}
      {errorMessage && <p className='support-form-error' role='alert'>{errorMessage}</p>}
      <div className='account-admin-disclosure'><b>Verification documents are disabled.</b> No identity files are collected or displayed. Account status changes below do not constitute KYC approval or regulatory verification.</div>
      <div className='account-admin-controls'><label className='portal-field'>Demo credit amount (USD)<input type='number' min='0.01' max='1000000' step='0.01' value={amount} onChange={event => setAmount(event.target.value)} /></label><label className='portal-field'>History note or demo trade label<input maxLength={180} value={note} onChange={event => setNote(event.target.value)} placeholder='Optional account activity note' /></label></div>
      {loading ? <p role='status'>Loading accounts…</p> : <div className='account-admin-list'>{accounts.map(account => <article className='account-admin-user' key={account.id}>
        <header><div><span className='dashboard-card-kicker'>CLIENT ACCOUNT</span><h2>{account.name || 'Account holder'}</h2><a href={'mailto:' + account.email}>{account.email}</a></div><span className='demo-pill'>{account.status.toUpperCase()}</span></header>
        <div className='account-admin-summary'><span>Demo wallet <b>{dollars(account.balanceCents)}</b></span><span>Reserved <b>{dollars(account.reservedCents)}</b></span><span>Identity check <b>Not configured</b></span></div>
        <div className='account-admin-actions'>
          <button type='button' disabled={busyId === account.id} onClick={() => perform(account, 'credit')}>Credit / top up demo balance</button>
          <button type='button' disabled={busyId === account.id || !note.trim()} onClick={() => perform(account, 'history-note')}>Add history note</button>
          <button type='button' disabled={busyId === account.id || !note.trim()} onClick={() => perform(account, 'create-trade')}>Add simulated trade</button>
          <button type='button' disabled={busyId === account.id} onClick={() => perform(account, 'set-status', { status: account.status === 'active' ? 'restricted' : 'active' })}>{account.status === 'active' ? 'Restrict account' : 'Restore account'}</button>
        </div>
        <div className='account-admin-requests'><b>Pending demo requests</b>{account.requests.filter(item => item.status === 'pending').map(request => <div className='account-admin-request' key={request.id}><span>{request.kind} · {dollars(request.amountCents)}</span><div><button type='button' disabled={busyId === account.id} onClick={() => perform(account, 'process-request', { request_id: request.id, decision: 'approved' })}>Approve demo</button><button type='button' className='muted' disabled={busyId === account.id} onClick={() => perform(account, 'process-request', { request_id: request.id, decision: 'rejected' })}>Reject</button></div></div>)}{!account.requests.some(item => item.status === 'pending') && <small>No pending requests.</small>}</div>
      </article>)}{!accounts.length && <p>No signed-in client accounts yet.</p>}</div>}
      {nextToken && <button className='secondary account-admin-next' disabled={loading} onClick={() => setCursor(nextToken)}>Next page</button>}
    </section>
  );
}
