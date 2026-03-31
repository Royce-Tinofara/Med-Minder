import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Shield, Activity, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Caregiver {
  id: string;
  name: string;
  relationship: string;
  initials: string;
  permissions: string[];
  lastActive: string;
  status: "online" | "offline";
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Caregivers = () => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCaregivers = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data: assignments, error } = await supabase
          .from("patient_assignments")
          .select("*")
          .eq("patient_id", userId);

        if (error) {
          console.error("Error fetching assignments:", error);
          setCaregivers([]);
          setLoading(false);
          return;
        }

        if (!assignments || assignments.length === 0) {
          setCaregivers([]);
          setLoading(false);
          return;
        }

        const assignedUserIds = assignments.map((a) => a.assigned_user_id);

        const { data: users, error: usersError } = await (supabase as any)
          .from("users")
          .select("id, first_name, last_name, role")
          .in("id", assignedUserIds);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          setCaregivers([]);
          setLoading(false);
          return;
        }

        const caregiverList: Caregiver[] = assignments.map((assignment) => {
          const user = users?.find((u) => u.id === assignment.assigned_user_id);
          const fullName = user 
            ? `${user.first_name} ${user.last_name}`.trim() 
            : "Unknown";
          const initials = fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return {
            id: assignment.id,
            name: fullName || "Unknown",
            relationship: assignment.assignment_role === "pharmacist" ? "Pharmacist" : "Caregiver",
            initials: initials || "??",
            permissions: assignment.permissions || ["View Medications"],
            lastActive: "Recently",
            status: "offline" as const,
          };
        });

        setCaregivers(caregiverList);
      } catch (err) {
        console.error("Error in fetchCaregivers:", err);
        setCaregivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCaregivers();
  }, [userId]);

  const handleInvite = () => {
    toast({ 
      title: "Invite Feature", 
      description: "Contact your healthcare provider to assign a caregiver or pharmacist to your account." 
    });
  };

  const handleViewActivity = (caregiver: Caregiver) => {
    toast({ 
      title: "Activity Log", 
      description: `Viewing activity for ${caregiver.name}. This feature shows medication adherence history.`
    });
  };

  const handleAlertSettings = (caregiver: Caregiver) => {
    toast({ 
      title: "Alert Settings", 
      description: `Managing alerts for ${caregiver.name}. Configure which notifications they receive.`
    });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Care Team</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : caregivers.length > 0 
              ? `${caregivers.length} connected team member${caregivers.length > 1 ? 's' : ''}`
              : "No caregivers or pharmacists assigned yet"}
          </p>
        </div>
        <button
          onClick={handleInvite}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          style={{ background: "var(--gradient-accent)" }}
        >
          <UserPlus className="h-4 w-4" /> Invite
        </button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : caregivers.length === 0 ? (
        <motion.div variants={item} className="glass-card-hover p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 font-display text-lg font-semibold">No Care Team Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't been assigned any caregivers or pharmacists yet. 
            Ask your healthcare provider to assign a caregiver or pharmacist to your account.
          </p>
        </motion.div>
      ) : (
        caregivers.map((cg) => (
          <motion.div key={cg.id} variants={item} className="glass-card-hover p-5">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-accent-foreground"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  {cg.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                    cg.status === "online" ? "bg-success" : "bg-muted-foreground"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-sm font-semibold">{cg.name}</h3>
                <p className="text-xs text-muted-foreground">{cg.relationship} · {cg.lastActive}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Shield className="h-3 w-3" /> Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cg.permissions.map((p) => (
                  <span key={p} className="rounded-lg bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-white/[0.04] pt-3">
              <button 
                onClick={() => handleViewActivity(cg)}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Activity className="h-3 w-3" /> View Activity
              </button>
              <button 
                onClick={() => handleAlertSettings(cg)}
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-3 w-3" /> Alert Settings
              </button>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};

export default Caregivers;
