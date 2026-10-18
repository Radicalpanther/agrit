export default function DashboardLoading() {
  return (
    <section className="dashboard-page" style={{ maxWidth: '1120px', margin: '0 auto', padding: '40px 22px' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ height: '12px', width: '100px', background: '#dce5d8', marginBottom: '8px' }} />
        <div style={{ height: '32px', width: '260px', background: '#dce5d8', marginBottom: '10px' }} />
        <div style={{ height: '14px', width: '380px', background: '#edf2eb' }} />
      </div>

      {/* Stats Cards Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: '#ffffff', border: '1px solid var(--line)', padding: '20px' }}>
            <div style={{ height: '12px', width: '90px', background: '#edf2eb', marginBottom: '12px' }} />
            <div style={{ height: '28px', width: '120px', background: '#dce5d8', marginBottom: '6px' }} />
            <div style={{ height: '11px', width: '140px', background: '#edf2eb' }} />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '32px', width: '100px', background: '#eef3eb' }} />
        ))}
      </div>

      {/* Main Panel Skeleton */}
      <div style={{ background: '#ffffff', border: '1px solid var(--line)', padding: '24px', minHeight: '300px' }}>
        <div style={{ height: '20px', width: '200px', background: '#dce5d8', marginBottom: '16px' }} />
        <div style={{ height: '60px', width: '100%', background: '#edf2eb', marginBottom: '12px' }} />
        <div style={{ height: '60px', width: '100%', background: '#edf2eb', marginBottom: '12px' }} />
        <div style={{ height: '60px', width: '100%', background: '#edf2eb' }} />
      </div>
    </section>
  )
}
