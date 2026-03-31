import { LayoutDashboard, Pill, Clock, Users, Stethoscope, Heart, User, BarChart3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const location = useLocation();
  const { profile } = useAuth();

  // Check localStorage directly to handle immediate navigation after login
  const storedProfile = !profile ? localStorage.getItem("userData") : null;
  const effectiveProfile = profile || (storedProfile ? JSON.parse(storedProfile) : null);

  const getNavItems = () => {
    if (effectiveProfile?.role === "pharmacist") {
      return [
        { icon: Stethoscope, label: "Pharmacy", path: "/pharmacist" },
        { icon: User, label: "Profile", path: "/profile" },
      ];
    }
    if (effectiveProfile?.role === "caregiver") {
      return [
        { icon: Heart, label: "Care", path: "/caregiver-dashboard" },
        { icon: Clock, label: "Reports", path: "/reminders" },
      ];
    }
    return [
      { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
      { icon: Pill, label: "Meds", path: "/medications" },
      { icon: Clock, label: "Today", path: "/reminders" },
      { icon: BarChart3, label: "Report", path: "/reports" },
      { icon: Users, label: "Care Team", path: "/caregivers" },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="relative flex flex-col items-center gap-1 px-3 py-1.5">
              {isActive && (
                <motion.div layoutId="nav-indicator" className="absolute -top-2 h-0.5 w-8 rounded-full bg-primary" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
              )}
              <item.icon className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
