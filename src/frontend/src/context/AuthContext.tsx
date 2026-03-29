import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "../backend.d";

interface Credentials {
  email: string;
  passwordHash: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  credits: number;
  credentials: Credentials | null;
}

interface AuthContextValue extends AuthState {
  login: (user: UserProfile, credentials: Credentials) => void;
  logout: () => void;
  setCredits: (credits: number) => void;
  refreshCredits: (actor: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "aitools_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          user: parsed.user,
          isLoggedIn: true,
          credits: parsed.credits ?? 0,
          credentials: parsed.credentials ?? null,
        };
      }
    } catch {
      // ignore
    }
    return { user: null, isLoggedIn: false, credits: 0, credentials: null };
  });

  useEffect(() => {
    if (state.isLoggedIn && state.user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: state.user,
          credits: state.credits,
          credentials: state.credentials,
        }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const login = useCallback((user: UserProfile, credentials: Credentials) => {
    setState({ user, isLoggedIn: true, credits: 0, credentials });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, isLoggedIn: false, credits: 0, credentials: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setCredits = useCallback((credits: number) => {
    setState((prev) => ({ ...prev, credits }));
  }, []);

  const refreshCredits = useCallback(async (actor: any) => {
    if (!actor) return;
    setState((prev) => {
      if (!prev.credentials) return prev;
      const { email, passwordHash } = prev.credentials;
      actor
        .getCredits(email, passwordHash)
        .then((c: bigint) => setState((p) => ({ ...p, credits: Number(c) })))
        .catch(() => {});
      return prev;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, setCredits, refreshCredits }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
