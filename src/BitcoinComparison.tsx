const centralizedSteps = [
  ['Payment submitted', 'A customer asks a central service or payment provider to move funds.'],
  ['Conflicting spend attempted', 'The same funds are requested for a second payment before the first settles.'],
  ['Central ledger checked', 'The service validates available funds and applies its processing rules.'],
  ['One request rejected', 'The operator decides which request to process. Operational or audit logs may still record rejected attempts.'],
];

const bitcoinSteps = [
  ['Transaction broadcast', 'A signed transaction is shared peer-to-peer and checked by receiving nodes.'],
  ['Conflicting spend attempted', 'The competing transaction tries to use the same input; peers may see candidates in different orders.'],
  ['Transactions wait in mempools', 'Each node has a temporary memory pool. Local policy generally prevents it from keeping two spends of the same input together.'],
  ['Miners assemble candidate blocks', 'Miners select transactions they consider valid, so candidate blocks may differ.'],
  ['Proof of work finds a block', 'Miners hash block headers until one meets the current target. This is a competitive process, not a random-node selection.'],
  ['Nodes validate and update the chain', 'The winning block is broadcast and independently validated. The confirmed spend is recorded, and conflicting transactions are removed from mempools that learn of the block.'],
];

function Steps({ steps, label }: { steps: string[][]; label: string }) {
  return (
    <ol className="bitcoin-step-list" aria-label={label}>
      {steps.map(([title, text], index) => (
        <li className="bitcoin-step" key={title}>
          <span className="bitcoin-step-badge" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <div><h3>{title}</h3><p>{text}</p></div>
        </li>
      ))}
    </ol>
  );
}

export function BitcoinComparison() {
  return (
    <section className="bitcoin-comparison" aria-labelledby="bitcoin-comparison-title">
      <div className="bitcoin-comparison-inner">
        <header className="bitcoin-comparison-heading">
          <span className="investment-example-eyebrow">A TWO-MINUTE EXPLAINER</span>
          <h2 id="bitcoin-comparison-title">Before Bitcoin vs. Bitcoin</h2>
          <p>How different systems handle two payment requests that try to spend the same funds.</p>
        </header>
        <div className="bitcoin-comparison-grid">
          <article className="bitcoin-system-card bitcoin-centralized">
            <div className="bitcoin-system-heading"><span className="bitcoin-system-icon" aria-hidden="true">01</span><div><span className="bitcoin-system-kicker">CENTRALIZED / TRADITIONAL</span><h3>A central service decides</h3></div></div>
            <Steps steps={centralizedSteps} label="Traditional centralized payment steps" />
            <p className="bitcoin-system-summary">The provider is the authority that records, accepts, rejects, or reverses requests under its rules.</p>
          </article>
          <article className="bitcoin-system-card bitcoin-decentralized">
            <div className="bitcoin-system-heading"><span className="bitcoin-system-icon" aria-hidden="true">₿</span><div><span className="bitcoin-system-kicker">DECENTRALIZED · MEMPOOL & BLOCKCHAIN</span><h3>Nodes validate; proof of work orders blocks</h3></div></div>
            <Steps steps={bitcoinSteps} label="Bitcoin double-spend resolution steps" />
            <p className="bitcoin-system-summary">There is no single operator choosing the ledger. Nodes validate blocks and follow the valid chain with the most accumulated proof of work.</p>
          </article>
        </div>
        <p className="bitcoin-comparison-note">Simplified overview: centralized payment systems differ. Mempools are temporary and may differ between nodes; rejected attempts may still appear in service or security logs. Bitcoin confirmations reduce reversal risk but are not an absolute guarantee.</p>
      </div>
    </section>
  );
}
