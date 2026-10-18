export default function FarmDetailLoading() {
  return (
    <section className="booking-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 22px' }}>
      <div style={{ height: '14px', width: '120px', background: '#e8ede6', marginBottom: '24px' }} />

      <div className="booking-layout">
        <div>
          {/* Photo Skeleton */}
          <div
            className="booking-photo"
            style={{
              background: '#e4ebe1',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />

          {/* Copy Skeleton */}
          <div className="booking-copy" style={{ marginTop: '24px' }}>
            <div style={{ height: '12px', width: '90px', background: '#dce5d8', marginBottom: '12px' }} />
            <div style={{ height: '32px', width: '280px', background: '#dce5d8', marginBottom: '14px' }} />
            <div style={{ height: '16px', width: '180px', background: '#e8ede6', marginBottom: '18px' }} />
            <div style={{ height: '60px', width: '100%', background: '#edf2eb', marginBottom: '20px' }} />

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: '32px', width: '110px', background: '#edf2eb' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar / Booking Summary Skeleton */}
        <div style={{ background: '#ffffff', border: '1px solid var(--line)', padding: '24px', height: '380px' }}>
          <div style={{ height: '18px', width: '140px', background: '#dce5d8', marginBottom: '16px' }} />
          <div style={{ height: '40px', width: '100%', background: '#edf2eb', marginBottom: '16px' }} />
          <div style={{ height: '40px', width: '100%', background: '#edf2eb', marginBottom: '16px' }} />
          <div style={{ height: '48px', width: '100%', background: '#dce5d8', marginTop: '30px' }} />
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
