"use client";

import { AmplifyProvider } from "./amplify-provider";
// Later you can import ThemeProvider, ToastProvider, etc.

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AmplifyProvider>
      {children}
    </AmplifyProvider>
  );
}
