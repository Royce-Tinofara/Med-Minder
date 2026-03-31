import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Globe,
  Shield,
  Bell,
  Eye,
  Type,
  Mic,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Profile = () => {
  const navigate = useNavigate();
  const { profile, userId, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`
    : "?";

  const settingsGroups = [
    {
      title: "Preferences",
      items: [
        { icon: Globe, label: "Language", value: "English" },
        { icon: Bell, label: "Notifications", value: "On" },
        { icon: Eye, label: "High Contrast", value: "Off" },
        { icon: Type, label: "Font Size", value: "Medium" },
        { icon: Mic, label: "Voice Commands", value: "Enabled" },
      ],
    },
    {
      title: "Security",
      items: [{ icon: Shield, label: "Two-Factor Auth", value: "Disabled" }],
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
      </motion.div>

      <motion.div variants={item} className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            {initials}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Shield className="h-3 w-3" /> {userId ? `ID: ${userId.slice(0, 8)}...` : 'Not signed in'}
            </p>
            {profile?.phone && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" /> {profile.phone}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
            {profile?.role || "patient"}
          </span>
          <span className="rounded-lg bg-success/10 px-3 py-1 text-xs font-medium text-success">
            Verified
          </span>
        </div>
      </motion.div>

      {settingsGroups.map((group) => (
        <motion.div key={group.title} variants={item} className="glass-card overflow-hidden">
          <h3 className="border-b border-white/[0.04] px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </h3>
          {group.items.map((setting, i) => (
            <button
              key={setting.label}
              className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${i < group.items.length - 1 ? "border-b border-white/[0.04]" : ""}`}
            >
              <setting.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm">{setting.label}</span>
              <span className="text-xs text-muted-foreground">{setting.value}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </motion.div>
      ))}

      <motion.div variants={item}>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </motion.div>
    </motion.div>
  );
};

export default Profile;
