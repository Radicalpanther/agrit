export default function ExploreLoading() {
  return (
    <section className="booking-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '60px 22px 30px' }}>
      <div style={{ marginBottom: '30px' }}>
        <div style={{ height: '12px', width: '130px', background: '#dce5d8', marginBottom: '10px' }} />
        <div style={{ height: '36px', width: '280px', background: '#dce5d8', marginBottom: '12px' }} />
        <div style={{ height: '14px', width: '360px', background: '#edf2eb' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: '34px', width: '90px', background: '#eef3eb', flexShrink: 0 }} />
        ))}
      </div>

      <div className="farm-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="farm-card" style={{ background: '#ffffff', border: '1px solid var(--line)' }}>
            <div style={{ height: '225px', background: '#e4ebe1', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ padding: '17px' }}>
              <div style={{ height: '18px', width: '70%', background: '#dce5d8', marginBottom: '10px' }} />
              <div style={{ height: '13px', width: '45%', background: '#edf2eb', marginBottom: '16px' }} />
              <div style={{ height: '14px', width: '85%', background: '#edf2eb', marginBottom: '18px' }} />
              <div style={{ height: '20px', width: '100%', background: '#eef3eb' }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  )
}
