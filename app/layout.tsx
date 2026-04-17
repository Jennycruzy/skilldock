import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/components/WalletProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'SkillDock — Pay-per-skill AI Marketplace',
  description:
    'Discover and execute AI skills instantly. Pay fractions of a cent in USDC via Purch x402 on Solana. No API keys. No accounts. Just a wallet.',
  openGraph: {
    title: 'SkillDock — Pay-per-skill AI Marketplace',
    description: 'Execute AI skills with Solana USDC micropayments. Powered by Purch x402.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <WalletProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer
            className="border-t py-4"
            style={{
              borderColor: 'var(--g-border)',
              fontFamily: "'Share Tech Mono', monospace",
            }}
          >
            <div
              className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2 text-xs"
              style={{ color: 'var(--g-muted)' }}
            >
              <span>
                SKILLDOCK V1.0.0 ·{' '}
                <a
                  href="https://app.purch.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  PURCH X402
                </a>
                {' '}· SOLANA DEVNET
              </span>
              <span style={{ color: 'var(--g-border)' }}>
                SERVER: ad1c686d-5f67-4160-ad50-72175071d9a7
              </span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
