import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "@/config/config";

// Types
interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "@auth_access_token",
  REFRESH_TOKEN: "@auth_refresh_token",
  USER: "@auth_user",
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL
const API_BASE_URL = `${BASE_URL}/api`;

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!tokens;

  // Load stored authentication data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedAccessToken, storedRefreshToken, storedUser] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
        ]);

      if (storedAccessToken && storedRefreshToken && storedUser) {
        const userObj = JSON.parse(storedUser);
        setUser(userObj);
        setTokens({
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
        });

        // Verify token is still valid
        const isValid = await verifyToken(storedAccessToken);
        if (!isValid) {
          // Try to refresh token
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            await clearAuthData();
          }
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
      await clearAuthData();
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
    }
  };

  const storeAuthData = async (userData: User, tokenData: AuthTokens) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.accessToken),
        AsyncStorage.setItem(
          STORAGE_KEYS.REFRESH_TOKEN,
          tokenData.refreshToken
        ),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)),
      ]);
      setUser(userData);
      setTokens(tokenData);
    } catch (error) {
      console.error("Error storing auth data:", error);
      throw error;
    }
  };

  const clearAuthData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      setUser(null);
      setTokens(null);
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await storeAuthData(data.user, data.tokens);
        return true;
      } else {
        throw new Error(data.message || "Invalid credentials");
      }
    } catch (error) {
      // console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await storeAuthData(data.user, data.tokens);
        return true;
      } else {
        const errorMessage = data.message || "Registration failed";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      if (!tokens?.refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newTokens = data.tokens;
        await storeAuthData(user!, newTokens);
        return true;
      } else {
        await clearAuthData();
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      await clearAuthData();
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (tokens?.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await clearAuthData();
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    loading,
    login,
    signup,
    logout,
    refreshAccessToken,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
