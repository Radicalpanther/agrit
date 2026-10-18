export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--mint)',
          borderTopColor: 'var(--forest)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '16px',
        }}
      />
      <p
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          fontWeight: 800,
          color: 'var(--leaf)',
          margin: 0,
        }}
      >
        AgriTrails
      </p>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '6px 0 0',
        }}
      >
        Loading farm experience...
      </h3>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
