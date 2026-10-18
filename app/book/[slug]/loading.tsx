export default function BookingLoading() {
  return (
    <section className="booking-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 22px' }}>
      <div style={{ height: '14px', width: '130px', background: '#e8ede6', marginBottom: '24px' }} />

      <div className="booking-layout">
        <div>
          <div
            className="booking-photo"
            style={{
              background: '#e4ebe1',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div style={{ marginTop: '20px' }}>
            <div style={{ height: '12px', width: '100px', background: '#dce5d8', marginBottom: '10px' }} />
            <div style={{ height: '28px', width: '240px', background: '#dce5d8', marginBottom: '12px' }} />
            <div style={{ height: '14px', width: '160px', background: '#edf2eb', marginBottom: '16px' }} />
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid var(--line)', padding: '24px' }}>
          <div style={{ height: '14px', width: '110px', background: '#dce5d8', marginBottom: '8px' }} />
          <div style={{ height: '26px', width: '180px', background: '#dce5d8', marginBottom: '20px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ height: '42px', width: '100%', background: '#edf2eb' }} />
            <div style={{ height: '42px', width: '100%', background: '#edf2eb' }} />
            <div style={{ height: '42px', width: '100%', background: '#edf2eb' }} />
            <div style={{ height: '48px', width: '100%', background: '#dce5d8', marginTop: '16px' }} />
          </div>
        </div>
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
