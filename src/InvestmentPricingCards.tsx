const plans = [
  {
    name: 'DIAMOND PLAN',
    price: '$3 BTC',
    theme: 'light',
    details: [
      ['Minimum Possible Deposit', '$3 BTC'],
      ['Maximum Possible Deposit', '$3 BTC'],
      ['Minimum Return', '$6 BTC'],
      ['Maximum Return', '$6 BTC'],
      ['Gift Bonus', '$0'],
      ['Duration', '21 days'],
    ],
  },
  {
    name: 'STARTER PLAN',
    price: '$500',
    theme: 'dark',
    details: [
      ['Minimum Possible Deposit', '$500'],
      ['Maximum Possible Deposit', '$500'],
      ['Minimum Return', '$5000'],
      ['Maximum Return', '$5000'],
      ['Gift Bonus', '$0'],
      ['Duration', '7 Days'],
    ],
  },
];

export function InvestmentPricingCards() {
  return (
    <section className="investment-plans-example" aria-labelledby="investment-plans-title">
      <div className="investment-plans-inner">
        <div className="investment-plans-heading">
          <span className="investment-example-eyebrow">INVESTMENT PLAN EXAMPLES</span>
          <h2 id="investment-plans-title">Pricing card layouts</h2>
          <p>Illustrative plan-card designs with the supplied amounts and terms.</p>
        </div>
        <div className="investment-plans-grid">
          {plans.map((plan) => (
            <article className={'investment-plan-card investment-plan-' + plan.theme} key={plan.name}>
              <header className="investment-plan-header">
                <span className="investment-plan-mark" aria-hidden="true">◇</span>
                <h3>{plan.name}</h3>
                <span className="investment-plan-price">{plan.price}</span>
              </header>
              <dl className="investment-plan-details">
                {plan.details.map(([label, value]) => (
                  <div className="investment-plan-row" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="investment-plan-tag">Illustrative example · not an active offer</p>
            </article>
          ))}
        </div>
        <p className="investment-plans-disclaimer">
          The displayed deposit and return figures were supplied as design examples and have not been verified.
          No investment plan, deposit service, yield, or return is currently offered or guaranteed.
        </p>
      </div>
    </section>
  );
}
