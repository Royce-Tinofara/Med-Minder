import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Globe,
  Shield,
  Bell,
  Sun,
  Moon,
  Type,
  Plus,
  Minus,
  ChevronRight,
  LogOut,
  X,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
import { requestNotificationPermission } from "@/utils/notifications";
import { toast } from "sonner";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();

  // Load notification preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("notificationsEnabled");
    setNotificationsEnabled(saved ? JSON.parse(saved) : false);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNotificationToggle = async () => {
    try {
      if (!notificationsEnabled) {
        // Enable notifications - request permission
        const permission = await requestNotificationPermission();
        if (permission) {
          setNotificationsEnabled(true);
          localStorage.setItem("notificationsEnabled", JSON.stringify(true));
          toast.success("Notifications enabled");
        } else {
          toast.error("Notification permission denied. You can enable this in browser settings.");
        }
      } else {
        // Disable notifications
        setNotificationsEnabled(false);
        localStorage.setItem("notificationsEnabled", JSON.stringify(false));
        toast.success("Notifications disabled");
      }
    } catch (err) {
      console.error("Error toggling notifications:", err);
      toast.error("Failed to update notification settings");
    }
  };

  const handleFontSizeChange = (newSize: number) => {
    if (newSize >= 14 && newSize <= 24) {
      setFontSize(newSize);
    }
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`
    : "?";

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

      {/* Preferences Section */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <h3 className="border-b border-white/[0.04] px-5 py-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Preferences
        </h3>
        
        {/* Language */}
        <div className="flex w-full items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] border-b border-white/[0.04]">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm">Language</span>
          <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <span className="text-xs text-muted-foreground">English</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Notifications */}
        <div className="flex w-full items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] border-b border-white/[0.04]">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm">Notifications</span>
          <motion.button
            onClick={handleNotificationToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationsEnabled ? "bg-success" : "bg-muted"
            }`}
          >
            <motion.div
              initial={false}
              animate={{ x: notificationsEnabled ? 20 : 2 }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white"
            >
              {notificationsEnabled ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground" />
              )}
            </motion.div>
          </motion.button>
        </div>

        {/* Appearance/Theme */}
        <div className="flex w-full items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03] border-b border-white/[0.04]">
          {theme === "dark" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="flex-1 text-sm">Appearance</span>
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-primary" : "bg-muted"
            }`}
          >
            <motion.div
              initial={false}
              animate={{ x: theme === "dark" ? 2 : 20 }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white"
            >
              {theme === "dark" ? (
                <Moon className="h-3 w-3 text-primary" />
              ) : (
                <Sun className="h-3 w-3 text-yellow-500" />
              )}
            </motion.div>
          </motion.button>
        </div>

        {/* Font Size */}
        <div className="flex w-full flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <Type className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm">Font Size</span>
            <span className="text-xs text-muted-foreground">{fontSize}px</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => handleFontSizeChange(fontSize - 2)}
              disabled={fontSize <= 14}
              whileHover={fontSize > 14 ? { scale: 1.1 } : {}}
              whileTap={fontSize > 14 ? { scale: 0.95 } : {}}
              className="rounded-lg bg-muted/50 p-1.5 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted disabled:hover:bg-muted/50 transition-colors"
            >
              <Minus className="h-4 w-4" />
            </motion.button>
            
            <div className="flex-1">
              <div className="h-1.5 rounded-full bg-muted/30">
                <motion.div
                  initial={false}
                  animate={{ width: `${((fontSize - 14) / (24 - 14)) * 100}%` }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>

            <motion.button
              onClick={() => handleFontSizeChange(fontSize + 2)}
              disabled={fontSize >= 24}
              whileHover={fontSize < 24 ? { scale: 1.1 } : {}}
              whileTap={fontSize < 24 ? { scale: 0.95 } : {}}
              className="rounded-lg bg-muted/50 p-1.5 text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted disabled:hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

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
