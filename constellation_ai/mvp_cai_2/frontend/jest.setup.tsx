import React from "react";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock MSAL
jest.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: {
      acquireTokenSilent: jest.fn(),
      loginPopup: jest.fn(),
      logoutPopup: jest.fn(),
    },
    accounts: [],
    inProgress: "none",
  }),
  useIsAuthenticated: () => false,
  MsalProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      email: "test@eastrock.com",
      display_name: "Test User",
      role: "ADMIN",
      is_active: true,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    getToken: jest.fn().mockResolvedValue("test-token"),
    login: jest.fn(),
    logout: jest.fn(),
    isDevMode: true,
  }),
}));

// Mock the API module
jest.mock("@/lib/api", () => ({
  api: {
    getCurrentUser: jest.fn().mockResolvedValue({
      id: "test-user-id",
      email: "test@eastrock.com",
      display_name: "Test User",
      role: "ADMIN",
    }),
    getContacts: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 }),
    getOrganizations: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 }),
    getActivities: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 }),
    getMyFollowUps: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 }),
    getFollowUps: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 }),
    getTagSets: jest.fn().mockResolvedValue([]),
    search: jest.fn().mockResolvedValue({ items: [], total: 0, query: "" }),
    getAuditLog: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 }),
  },
}));

// Mock msal-config
jest.mock("@/lib/msal-config", () => ({
  msalConfig: {},
  loginRequest: { scopes: [] },
  isDevMode: true,
}));
