"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useCallback } from "react";

type AuthenticatedUser = {
  isLoggedIn: true;
  id: string;
  nickname: string;
  created_at: string;
  last_login_at: string | null;
  status: string;
};

type GuestUser = {
  isLoggedIn: false;
  id: null;
  nickname: null;
  created_at: null;
  last_login_at: null;
  status: string;
};

type CurrentUser = AuthenticatedUser | GuestUser;

type AuthContextValue = {
  currentUser: CurrentUser;
  isLoading: boolean;
  login: (input: { nickname: string; pin: string }) => Promise<{ ok: boolean; error?: string }>;
  register: (input: { nickname: string; pin: string }) => Promise<{ ok: boolean; error?: string }>;
  updateNickname: (input: { nickname: string }) => Promise<{ ok: boolean; error?: string }>;
  updatePin: (input: { currentPin: string; newPin: string }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
};

const guestUser: GuestUser = {
  isLoggedIn: false,
  id: null,
  nickname: null,
  created_at: null,
  last_login_at: null,
  status: "訪客模式可以直接單筆輸入",
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_ME_RETRY_DELAYS_MS = [180, 420];

function toAuthenticatedUser(user: {
  id: string;
  nickname: string;
  created_at: string;
  last_login_at?: string | null;
}): AuthenticatedUser {
  return {
    isLoggedIn: true,
    id: user.id,
    nickname: user.nickname,
    created_at: user.created_at,
    last_login_at: user.last_login_at ?? null,
    status: "今天也來記一件好事",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(guestUser);
  const [isLoading, setIsLoading] = useState(true);

  const sleep = useCallback(async (ms: number) => {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }, []);

  const fetchCurrentUserWithRetry = useCallback(async () => {
    for (let attempt = 0; attempt <= AUTH_ME_RETRY_DELAYS_MS.length; attempt += 1) {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as {
          user?: {
            id: string;
            nickname: string;
            created_at: string;
            last_login_at?: string | null;
          };
        };

        return data.user ? toAuthenticatedUser(data.user) : guestUser;
      }

      const shouldRetry = response.status === 401 && attempt < AUTH_ME_RETRY_DELAYS_MS.length;
      if (!shouldRetry) {
        return guestUser;
      }

      await sleep(AUTH_ME_RETRY_DELAYS_MS[attempt]);
    }

    return guestUser;
  }, [sleep]);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const nextUser = await fetchCurrentUserWithRetry();
      setCurrentUser(nextUser);
    } catch {
      setCurrentUser(guestUser);
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUserWithRetry]);

  useEffect(() => {
    void refreshCurrentUser();
  }, [refreshCurrentUser]);

  async function login(input: { nickname: string; pin: string }) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as {
        user?: {
          id: string;
          nickname: string;
          created_at: string;
          last_login_at?: string | null;
        };
        error?: string;
      };

      if (!response.ok || !data.user) {
        return { ok: false, error: data.error ?? "登入失敗" };
      }

      setCurrentUser(toAuthenticatedUser(data.user));
      return { ok: true };
    } catch {
      return { ok: false, error: "登入失敗" };
    }
  }

  async function register(input: { nickname: string; pin: string }) {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as {
        user?: {
          id: string;
          nickname: string;
          created_at: string;
          last_login_at?: string | null;
        };
        error?: string;
      };

      if (!response.ok || !data.user) {
        return { ok: false, error: data.error ?? "註冊失敗" };
      }

      setCurrentUser(toAuthenticatedUser(data.user));
      return { ok: true };
    } catch {
      return { ok: false, error: "註冊失敗" };
    }
  }

  async function updateNickname(input: { nickname: string }) {
    try {
      const response = await fetch("/api/auth/nickname", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as {
        user?: {
          id: string;
          nickname: string;
          created_at: string;
          last_login_at?: string | null;
        };
        error?: string;
      };

      if (!response.ok || !data.user) {
        return { ok: false, error: data.error ?? "更新暱稱失敗" };
      }

      setCurrentUser(toAuthenticatedUser(data.user));
      return { ok: true };
    } catch {
      return { ok: false, error: "更新暱稱失敗" };
    }
  }

  async function updatePin(input: { currentPin: string; newPin: string }) {
    try {
      const response = await fetch("/api/auth/pin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        return { ok: false, error: data.error ?? "更新 PIN 失敗" };
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "更新 PIN 失敗" };
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCurrentUser(guestUser);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        register,
        updateNickname,
        updatePin,
        logout,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
