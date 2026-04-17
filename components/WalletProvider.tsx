'use client';

import {
  CrossmintProvider,
  CrossmintAuthProvider,
  CrossmintWalletProvider,
} from '@crossmint/client-sdk-react-ui';

const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_KEY || '';
const crossmintReady = /^[cs]k_/.test(apiKey);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  if (!crossmintReady) {
    return <>{children}</>;
  }

  const appearance = {
    colors: {
      background:          '#13131f',
      backgroundSecondary: '#1a1a2e',
      backgroundTertiary:  '#0c0c14',
      textPrimary:         '#ffffff',
      textSecondary:       '#a1a1aa',
      textLink:            '#a855f7',
      inputBackground:     '#0c0c14',
      buttonBackground:    '#9333ea',
      accent:              '#9333ea',
      border:              'rgba(255,255,255,0.12)',
      danger:              '#ef4444',
    },
    borderRadius: '8px',
  };

  return (
    <CrossmintProvider apiKey={apiKey}>
      <CrossmintAuthProvider
        loginMethods={['email', 'google']}
        appearance={appearance}
      >
        <CrossmintWalletProvider
          createOnLogin={{ chain: 'solana', recovery: { type: 'email' } }}
          appearance={appearance}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
