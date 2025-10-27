import React from 'react';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';
import { RoleProvider } from '../contexts/RoleContext';
import '../styles/ayu-theme.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <RoleProvider>
        <Component {...pageProps} />
      </RoleProvider>
    </AuthProvider>
  );
}

export default MyApp;
