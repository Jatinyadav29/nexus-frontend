import {
  createContext,
  useState,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { api, onUnauthorized, ApiError } from "../api";
import type { AuthUser, LoginResponse } from "../types/api";

/**
 * The signed-in user: the login/register shape, or the fuller profile after
 * a session restore (`ProfileUser` extends `AuthUser`).
 */
export type SessionUser = AuthUser;

export interface AuthContextValue {
  user: SessionUser | null;
  setUser: Dispatch<SetStateAction<SessionUser | null>>;
  /** True until the session check on mount has answered. */
  loading: boolean;
  /** Rejects with an ApiError on bad credentials. */
  login: (email: string, password: string) => Promise<LoginResponse>;
  /** Never rejects; the user is cleared even when the call fails. */
  logout: () => Promise<void>;
}

// Every consumer is rendered inside AuthProvider (main.tsx); this default
// only serves a component rendered outside it: logged out, not loading.
const outsideProvider: AuthContextValue = {
  user: null,
  setUser: () => {},
  loading: false,
  login: () => Promise.reject(new Error("AuthProvider is missing")),
  logout: () => Promise.resolve(),
};

export const AuthContext = createContext<AuthContextValue>(outsideProvider);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Contract M-23: any 401 means the session is gone; clearing the user lets
  // ProtectedRoute send the visitor to /login.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await api.users.profile();
        setUser(res.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
        } else {
          console.error(
            "System Sync Error:",
            error instanceof Error ? error.message : error,
          );
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api.users.login({ email, password });
    setUser(res.user);
    return res;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.users.logout();
    } catch (err) {
      console.error("Logout sequence failed", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
