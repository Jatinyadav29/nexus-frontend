import { createContext, useState, useEffect } from "react";
import axios from "axios";

// Axios ko default credentials bhejne ko bolo (taaki session cookie backend tak jaye)
axios.defaults.withCredentials = true;
// Tumhara backend port
axios.defaults.baseURL = "http://localhost:3005";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currUser, setCurrUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check on load if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get("/api/users/me");
        if (response.data.success) {
          setCurrUser(response.data.user);
        }
      } catch (error) {
        setCurrUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const response = await axios.post("/api/users/login", {
      username,
      password,
    });
    if (response.data.success) {
      setCurrUser(response.data.user);
    }
    return response.data;
  };

  const logout = async () => {
    await axios.post("/api/users/logout");
    setCurrUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ currUser, setCurrUser, login, logout, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
