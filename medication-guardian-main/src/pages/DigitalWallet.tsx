import { motion } from "framer-motion";
import { CreditCard, Plus, Shield, Star, ChevronRight } from "lucide-react";

const walletItems = [
  {
    id: 1,
    type: "Insurance",
    name: "Blue Cross Blue Shield",
    number: "••••  ••••  ••••  4832",
    gradient: "var(--gradient-primary)",
  },
  {
    id: 2,
    type: "Pharmacy Rewards",
    name: "CVS ExtraCare",
    number: "••••  ••••  7291",
    gradient: "var(--gradient-accent)",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const DigitalWallet = () => {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Digital Wallet</h1>
          <p className="text-sm text-muted-foreground">Your cards & insurance info</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="h-4 w-4" /> Add Card
        </button>
      </motion.div>

      {walletItems.map((card) => (
        <motion.div
          key={card.id}
          variants={item}
          className="relative overflow-hidden rounded-2xl p-6"
          style={{ background: card.gradient }}
        >
          <div className="absolute right-4 top-4 opacity-10">
            <CreditCard className="h-20 w-20" />
          </div>
          <p className="text-xs font-medium text-primary-foreground/70">{card.type}</p>
          <h3 className="mt-1 font-display text-lg font-bold text-primary-foreground">
            {card.name}
          </h3>
          <p className="mt-4 font-mono text-sm tracking-widest text-primary-foreground/80">
            {card.number}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-primary-foreground/60" />
            <span className="text-[11px] text-primary-foreground/60">Encrypted & Secure</span>
          </div>
        </motion.div>
      ))}

      <motion.div variants={item} className="glass-card p-5">
        <h3 className="mb-3 font-display text-sm font-semibold">Quick Actions</h3>
        {["Share with pharmacy", "Export insurance info", "Scan new card"].map((action) => (
          <button
            key={action}
            className="flex w-full items-center justify-between border-b border-white/[0.04] py-3 text-sm text-muted-foreground transition-colors hover:text-foreground last:border-0"
          >
            {action}
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default DigitalWallet;
