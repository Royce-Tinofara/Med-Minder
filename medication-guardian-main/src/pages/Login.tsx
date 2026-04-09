import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: AppRole;
}

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the custom users table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username.toLowerCase())
        .eq("password_hash", password)
        .single();

      if (error || !data) {
        toast.error("Invalid username or password");
        setIsLoading(false);
        return;
      }

      // Store user data in localStorage for persistence
      const userData: UserData = {
        id: data.id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      };
      
      localStorage.setItem("userData", JSON.stringify(userData));
      toast.success(`Welcome back, ${data.first_name}!`);
      
      // Navigate based on role - go directly to dashboard
      if (data.role === "pharmacist") {
        navigate("/pharmacist");
      } else if (data.role === "caregiver") {
        navigate("/caregiver-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[2rem] glow-primary" style={{ background: "var(--gradient-primary)" }}>
            <svg width="28" height="20" viewBox="0 0 28 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="14" height="20" rx="10" fill="#ffffff"/>
              <rect x="14" width="14" height="20" rx="10" fill="#0f172a"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold">
            Welcome to <span className="gradient-text-primary">MediMinder</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <input 
              type="text"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter your username" 
              className="glass-input w-full" 
              required 
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
            <input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="glass-input w-full" 
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full rounded-xl py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50" 
            style={{ background: "var(--gradient-primary)" }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
