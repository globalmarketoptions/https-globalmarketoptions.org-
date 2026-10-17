const allocations = [
  { name: 'Intra-Day Trading', amount: '$500', share: '5%', width: '5%' },
  { name: 'Swing Trading', amount: '$4,500', share: '45%', width: '45%' },
  { name: 'Buy & Hold', amount: '$5,000', share: '50%', width: '50%' },
];

export function InvestmentAllocation() {
  return (
    <section className="investment-example" aria-labelledby="investment-example-title">
      <div className="investment-example-inner">
        <div className="investment-example-heading">
          <span className="investment-example-eyebrow">A SIMPLE ALLOCATION EXAMPLE</span>
          <h2 id="investment-example-title">How I Would Invest $10,000 as a Beginner</h2>
          <p>One way to divide a hypothetical starting portfolio across three time horizons.</p>
        </div>

        <div className="investment-tree">
          <div className="investment-balance-card">
            <span className="investment-balance-icon" aria-hidden="true">$</span>
            <div>
              <span className="investment-card-label">INITIAL BALANCE</span>
              <strong>$10,000</strong>
              <span className="investment-balance-caption">Illustrative portfolio</span>
            </div>
          </div>

          <div className="investment-branches" aria-hidden="true">
            <span className="investment-trunk" />
            <span className="investment-branch-line" />
          </div>

          <div className="investment-allocation-grid">
            {allocations.map((allocation) => (
              <article className="investment-allocation-card" key={allocation.name}>
                <div className="investment-allocation-top">
                  <span className="investment-allocation-dot" aria-hidden="true" />
                  <span className="investment-card-label">{allocation.name}</span>
                  <strong>{allocation.share}</strong>
                </div>
                <div className="investment-allocation-amount">{allocation.amount}</div>
                <div
                  className="investment-allocation-track"
                  role="img"
                  aria-label={allocation.share + ' of the example portfolio'}
                >
                  <span style={{ width: allocation.width }} />
                </div>
                <span className="investment-allocation-caption">Portfolio allocation</span>
              </article>
            ))}
          </div>
        </div>

        <p className="investment-example-note">
          For educational illustration only. This is not personalized investment advice.
          Investments can lose value; allocations and outcomes are not guaranteed.
        </p>
      </div>
    </section>
  );
}
