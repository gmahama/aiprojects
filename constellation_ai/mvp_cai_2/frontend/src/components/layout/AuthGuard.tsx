"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, error, login, isDevMode } = useAuth();

  // Auto-login in dev mode
  useEffect(() => {
    if (isDevMode && !isAuthenticated && !isLoading) {
      login();
    }
  }, [isDevMode, isAuthenticated, isLoading, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary-600 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-white">C</span>
            </div>
            <CardTitle>Constellation AI</CardTitle>
            <CardDescription>
              Internal CRM and knowledge platform for East Rock
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <Button onClick={login} className="w-full">
              Sign in with Microsoft
            </Button>
            {isDevMode && (
              <p className="text-xs text-center text-muted-foreground">
                Dev mode enabled - authentication bypassed
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
