import { createContext, useState, useEffect } from "react";
import { api, onUnauthorized } from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        if (error.status === 401) {
          setUser(null);
        } else {
          console.error("System Sync Error:", error.message);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.users.login({ email, password });
    setUser(res.user);
    return res;
  };

  const logout = async () => {
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
