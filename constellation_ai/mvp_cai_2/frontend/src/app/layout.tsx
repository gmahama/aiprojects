"use client";

import { Inter } from "next/font/google";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, isDevMode } from "@/lib/msal-config";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Initialize MSAL instance (only in non-dev mode)
const msalInstance = !isDevMode ? new PublicClientApplication(msalConfig) : null;

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In dev mode, skip MSAL provider
  if (isDevMode) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <AppContent>{children}</AppContent>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <MsalProvider instance={msalInstance!}>
          <AppContent>{children}</AppContent>
        </MsalProvider>
      </body>
    </html>
  );
}
