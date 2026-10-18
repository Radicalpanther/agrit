export function HarvestPlaceholder() {
  return (
    <section className="section" id="harvest-calendar" style={{ paddingBottom: '90px' }}>
      <div
        style={{
          border: '1px solid var(--line)',
          backgroundColor: '#ffffff',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <p className="section-kicker" style={{ marginBottom: '8px' }}>
          Seasonal agro-tourism
        </p>
        <h2 style={{ fontSize: '26px', letterSpacing: '-1px', margin: '0 0 10px', color: 'var(--ink)' }}>
          Live Seasonal Harvest Calendar
        </h2>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: '13px',
            margin: '0 auto',
            maxWidth: '520px',
            lineHeight: 1.6,
          }}
        >
          Direct farm-to-table experiences and seasonal picking schedules across Indian agricultural belts will be displayed here.
        </p>
      </div>
    </section>
  )
}
