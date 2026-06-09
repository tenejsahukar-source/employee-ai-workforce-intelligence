import React, { createContext, useContext, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "hr" | "executive";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, pass: string) => {
    // Unlock the application state
    setUser({
      id: "usr-001",
      email: email,
      name: "Authorized Executive",
      role: "admin", // or "executive" depending on what your dashboard needs
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token"); // Good practice to clear this on logout!
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) =>
      prev ? { ...prev, ...updates } : null
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: false,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}