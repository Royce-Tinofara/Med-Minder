import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AppRole>("patient");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .single();

      if (existingUser) {
        toast.error("Username already taken. Please choose a different one.");
        setIsLoading(false);
        return;
      }

      // Create user in custom users table
      const { data, error } = await supabase
        .from("users")
        .insert({
          username: username.toLowerCase(),
          password_hash: password,
          first_name: firstName,
          last_name: lastName,
          role: role,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        toast.success("Account created! You can now login.");
        navigate("/login");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
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
            Create Account On <span className="gradient-text-primary">MediMinder</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Username</label>
            <input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="johndoe" 
              className="glass-input w-full" 
              required 
              minLength={3}
              maxLength={20}
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
              minLength={6}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">First Name</label>
              <input 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="John" 
                className="glass-input w-full" 
                required 
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Last Name</label>
              <input 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Doe" 
                className="glass-input w-full" 
                required 
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">I am a</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value as AppRole)} 
              className="glass-input w-full"
            >
              <option value="patient">Patient</option>
              <option value="caregiver">Caregiver</option>
              <option value="pharmacist">Pharmacist</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full rounded-xl py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50" 
            style={{ background: "var(--gradient-primary)" }}
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Register;
