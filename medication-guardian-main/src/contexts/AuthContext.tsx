import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: AppRole;
}

interface AuthContextType {
  userId: string | null;
  profile: UserData | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage synchronously to avoid race conditions
  const storedUser = localStorage.getItem("userData");
  let initialProfile: UserData | null = null;
  let initialUserId: string | null = null;
  
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      initialUserId = userData.id;
      initialProfile = userData;
    } catch (e) {
      localStorage.removeItem("userData");
    }
  }

  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [profile, setProfile] = useState<UserData | null>(initialProfile);
  const [loading, setLoading] = useState(false); // Set to false since we already checked localStorage
  const navigate = useNavigate();

  useEffect(() => {
    // Check for stored user data on mount (for edge cases like SSO callbacks)
    const storedUser = localStorage.getItem("userData");
    if (storedUser && !profile) {
      try {
        const userData = JSON.parse(storedUser);
        setUserId(userData.id);
        setProfile(userData);
      } catch (e) {
        localStorage.removeItem("userData");
      }
    }
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username.toLowerCase())
        .eq("password_hash", password)
        .single();

      if (error || !data) {
        return { success: false, error: "Invalid username or password" };
      }

      const userData: UserData = {
        id: data.id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      };

      setUserId(userData.id);
      setProfile(userData);
      localStorage.setItem("userData", JSON.stringify(userData));

      return { success: true };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const signOut = () => {
    setUserId(null);
    setProfile(null);
    localStorage.removeItem("userData");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ userId, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
