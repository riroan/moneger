'use client';

export default function Footer() {
  return (
    <footer
      className="border-t border-[var(--border)]"
      style={{ padding: '32px 0', marginTop: '48px' }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(to bottom, #2dd4bf, #22d3ee, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: 'white', fontWeight: 700, fontSize: '10px' }}>M</span>
            </div>
          </div>
          <span className="text-text-primary font-semibold">MONEGER</span>
        </div>

        <div className="text-sm text-text-muted">
          © 2026 MONEGER. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
