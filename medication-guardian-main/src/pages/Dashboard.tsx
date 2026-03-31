import { motion } from "framer-motion";
import {
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TodayReminder {
  id: string;
  medication: string;
  dosage: string;
  time: string;
  status: "taken" | "pending" | "missed";
}

const statusConfig = {
  taken: {
    icon: CheckCircle2,
    className: "traffic-green",
    badge: "bg-success/10 text-success",
    label: "Taken",
  },
  pending: {
    icon: Timer,
    className: "traffic-yellow",
    badge: "bg-warning/10 text-warning",
    label: "Pending",
  },
  missed: {
    icon: XCircle,
    className: "traffic-red",
    badge: "bg-destructive/10 text-destructive",
    label: "Missed",
  },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// Helper function to get time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const Dashboard = () => {
  const { userId, profile } = useAuth();
  const [todayReminders, setTodayReminders] = useState<TodayReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMedsCount, setActiveMedsCount] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Get active medications count
      const { data: meds } = await supabase
        .from("patient_medications")
        .select("id, quantity_remaining, total_quantity")
        .eq("patient_id", userId)
        .eq("status", "active");

      const medsCount = meds?.length || 0;
      setActiveMedsCount(medsCount);

      // Get today's reminders
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Fetch medications with times
      const { data: medications } = await supabase
        .from("patient_medications")
        .select(`
          id,
          dosage,
          times,
          medication_id,
          medications(name)
        `)
        .eq("patient_id", userId)
        .eq("status", "active");

      if (!medications || medications.length === 0) {
        setTodayReminders([]);
        setLoading(false);
        return;
      }

      // Generate today's reminders from medication schedules
      const currentTime = new Date();
      const reminders: TodayReminder[] = [];

      for (const med of medications) {
        const medTimes = med.times || [];
        
        for (const timeStr of medTimes) {
          // Parse time string
          let hours: number, minutes: number;
          
          if (timeStr.includes('AM') || timeStr.includes('PM')) {
            const isPM = timeStr.includes('PM');
            const timeParts = timeStr.replace(/(AM|PM)/i, '').trim().split(':');
            hours = parseInt(timeParts[0]);
            minutes = parseInt(timeParts[1] || '0');
            if (isPM && hours !== 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
          } else {
            const timeParts = timeStr.split(':');
            hours = parseInt(timeParts[0]);
            minutes = parseInt(timeParts[1] || '0');
          }

          const scheduledTime = new Date();
          scheduledTime.setHours(hours, minutes, 0, 0);

          const displayTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          
          // Determine status based on current time
          let status: "taken" | "pending" | "missed" = "pending";
          if (scheduledTime < currentTime) {
            // If time has passed but within 3 hours, still pending, otherwise missed
            const hoursDiff = (currentTime.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
            status = hoursDiff > 3 ? "missed" : "pending";
          }

          reminders.push({
            id: `${med.id}-${timeStr}`,
            medication: (med.medications as any)?.name || "Unknown",
            dosage: med.dosage,
            time: displayTime,
            status,
          });
        }
      }

      // Sort by time
      reminders.sort((a, b) => a.time.localeCompare(b.time));
      
      // Take first 4 for dashboard display
      setTodayReminders(reminders.slice(0, 4));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const takenCount = todayReminders.filter(r => r.status === "taken").length;
  const pendingCount = todayReminders.filter(r => r.status === "pending").length;
  const missedCount = todayReminders.filter(r => r.status === "missed").length;
  const alertsCount = missedCount;

  // Get user name
  const userName = profile?.first_name || "User";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="font-display text-2xl font-bold">
          Good {getTimeOfDay()}, <span className="gradient-text-primary">{userName}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading 
            ? "Loading..." 
            : `${pendingCount > 0 ? `You have ${pendingCount} medication${pendingCount > 1 ? 's' : ''} scheduled` : 'No medications pending'}`}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {
          [
            {
              label: "Active Meds",
              value: activeMedsCount.toString(),
              icon: Pill,
              gradient: "var(--gradient-accent)",
            },
            {
              label: "Today Left",
              value: pendingCount.toString(),
              icon: Clock,
              gradient: "var(--gradient-warning)",
            },
            {
              label: "Alerts",
              value: alertsCount.toString(),
              icon: AlertTriangle,
              gradient: "var(--gradient-danger)",
            },
          ].map((stat) => (
          <div key={stat.label} className="glass-card-hover p-4">
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: stat.gradient }}
            >
              <stat.icon className="h-5 w-5 text-foreground" />
            </div>
            <p className="font-display text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Today's Schedule */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">Today's Schedule</h2>
          </div>
          <Link
            to="/reminders"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : todayReminders.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Pill className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p>No medications scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayReminders.map((reminder) => {
              const config = statusConfig[reminder.status];
              const Icon = config.icon;
              return (
                <motion.div
                  key={reminder.id}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.badge}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {reminder.medication} <span className="text-muted-foreground">{reminder.dosage}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{reminder.time}</p>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${config.badge}`}
                  >
                    {config.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;


 
