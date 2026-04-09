import { Bell, Search, User } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Header = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-9 items-center justify-center rounded-full bg-primary/20 glow-primary">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="10" height="14" rx="7" fill="#22c55e"/>
              <rect x="10" width="10" height="14" rx="7" fill="#0f172a"/>
            </svg>
          </div>
          <span className="font-display text-lg font-bold text-foreground">
            Medi<span className="text-primary">Minder</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
