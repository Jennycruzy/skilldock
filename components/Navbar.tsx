'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCrossmintAuth } from '@crossmint/client-sdk-react-ui';

const NAV_LINKS = [
  { href: '/', label: 'LIST' },
  { href: '/play/scrape', label: 'EXECUTE' },
  { href: '/docs', label: 'DOCS' },
  { href: '/register', label: 'REGISTER' },
  { href: '/leaderboard', label: 'LEADERBOARD' },
];

const crossmintReady = /^[cs]k_/.test(process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_KEY || '');

// Isolated so hooks are only called when the provider is actually mounted
function NavAuthSection() {
  const { user, login, logout, status } = useCrossmintAuth();
  const isLoggedIn = status === 'logged-in';

  return isLoggedIn ? (
    <div className="flex items-center gap-3">
      <span className="hidden sm:block text-xs truncate max-w-[140px]" style={{ color: 'var(--text-3)', fontFamily: 'inherit' }}>
        {user?.email || 'Connected'}
      </span>
      <button
        onClick={() => logout()}
        style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
      >
        Sign out
      </button>
    </div>
  ) : (
    <button
      onClick={() => login()}
      style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      Sign in
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50" style={{ background: 'rgba(12,12,20,0.9)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 40px' }}>
        <div className="flex items-center justify-between gap-6" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'VT323', monospace", fontSize: '26px', color: 'var(--text-1)', letterSpacing: '0.08em', lineHeight: 1 }}>
              SKILLDOCK
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: "'Share Tech Mono', monospace" }}>v1.0</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                    textDecoration: 'none', transition: 'all 0.15s',
                    background: active ? 'var(--purple-subtle)' : 'transparent',
                    color: active ? 'var(--purple-light)' : 'var(--text-2)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: "'Share Tech Mono', monospace" }}>
              <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ background: 'var(--green)', display: 'inline-block' }} />
              Devnet
            </div>
            {crossmintReady && <NavAuthSection />}
          </div>
        </div>
      </div>
    </nav>
  );
}
