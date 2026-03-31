import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Pill,
  Plus,
  Heart,
  Search,
  ChevronRight,
  AlertCircle,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  FileText,
  Calendar,
  BarChart3,
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AddMedicationDialog from "@/components/Medications/AddMedicationDialog";
import { toast } from "sonner";

interface PatientData {
  patient_id: string;
  first_name: string;
  last_name: string;
  medications: {
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string | null;
    status: string | null;
    quantity_remaining: number | null;
    total_quantity: number | null;
  }[];
  reminders: {
    id: string;
    scheduled_time: string;
    status: string | null;
    medication_name: string;
  }[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const statusIcon = {
  taken: <CheckCircle2 className="h-4 w-4 text-success" />,
  missed: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-warning" />,
  snoozed: <Clock className="h-4 w-4 text-accent" />,
};

const CaregiverDashboard = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [addMedPatientId, setAddMedPatientId] = useState<string | null>(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientUsername, setNewPatientUsername] = useState("");
  const [showReports, setShowReports] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<"7" | "30" | "90">("30");

  const fetchData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      // Get patient assignments - caregivers can see assigned patients
      const { data: assignments } = await supabase
        .from("patient_assignments")
        .select("patient_id")
        .eq("assigned_user_id", profile.id)
        .eq("assignment_role", "caregiver");

      if (!assignments || assignments.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = assignments.map((a) => a.patient_id);

      // Get patient profiles from our custom users table
      const { data: patientProfiles } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", patientIds);

      // Get medications for these patients with medication details
      const { data: meds } = await (supabase as any)
        .from("patient_medications")
        .select("id, patient_id, dosage, frequency, status, quantity_remaining, total_quantity, medications(name)")
        .in("patient_id", patientIds);

      // Get reminders with medication details
      const { data: reminders } = await (supabase as any)
        .from("reminder_logs")
        .select(`
          id,
          patient_id,
          scheduled_time,
          status,
          medication_id,
          patient_medications(id, dosage, medications(name))
        `)
        .in("patient_id", patientIds)
        .order("scheduled_time", { ascending: false })
        .limit(50);

      const patientsData: PatientData[] = (patientProfiles || []).map((p) => ({
        patient_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        medications: (meds || [])
          .filter((m: any) => m.patient_id === p.id)
          .map((m: any) => ({
            id: m.id,
            medication_name: m.medications?.name || "Unknown",
            dosage: m.dosage,
            frequency: m.frequency,
            status: m.status,
            quantity_remaining: m.quantity_remaining,
            total_quantity: m.total_quantity,
          })),
        reminders: (reminders || [])
          .filter((r: any) => r.patient_id === p.id)
          .slice(0, 5)
          .map((r: any) => ({
            id: r.id,
            scheduled_time: r.scheduled_time,
            status: r.status,
            medication_name: r.patient_medications?.medications?.name || "Medication",
          })),
      }));

      setPatients(patientsData);
    } catch (err) {
      console.error("Error fetching caregiver data:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add new patient to caregiver's list
  const handleAddPatient = async () => {
    if (!newPatientUsername || !profile?.id) return;

    try {
      // Find the patient by username
      const { data: patient, error: findError } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .eq("username", newPatientUsername.toLowerCase())
        .single();

      if (findError || !patient) {
        toast.error("Patient not found. Make sure the username is correct.");
        return;
      }

      // Check if already assigned
      const { data: existing } = await supabase
        .from("patient_assignments")
        .select("id")
        .eq("patient_id", patient.id)
        .eq("assigned_user_id", profile.id)
        .single();

      if (existing) {
        toast.error("This patient is already assigned to you.");
        return;
      }

      // Create assignment
      const { error: assignError } = await supabase
        .from("patient_assignments")
        .insert({
          patient_id: patient.id,
          assigned_user_id: profile.id,
          assignment_role: "caregiver",
          permissions: ["view_medications", "add_medications"],
        });

      if (assignError) {
        toast.error("Failed to add patient: " + assignError.message);
        return;
      }

      toast.success(`${patient.first_name} ${patient.last_name} added to your care!`);
      setAddPatientOpen(false);
      setNewPatientUsername("");
      fetchData();
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error(err);
    }
  };

  // Fetch patient reports
  const fetchPatientReports = async (patientId: string) => {
    setReportLoading(true);
    try {
      const daysAgo = parseInt(reportDateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get reminder logs with related medication data
      const { data: logs } = await (supabase as any)
        .from("reminder_logs")
        .select(`
          id,
          medication_id,
          scheduled_time,
          actual_time,
          status,
          notes,
          created_at,
          patient_medications(id, dosage, medications(name))
        `)
        .eq("patient_id", patientId)
        .gte("scheduled_time", startDate.toISOString())
        .order("scheduled_time", { ascending: false });

      if (!logs || logs.length === 0) {
        setReportData([]);
        setReportLoading(false);
        return;
      }

      // Combine data
      const formattedLogs = (logs || []).map((log: any) => ({
        ...log,
        medication_name: log.patient_medications?.medications?.name || "Unknown",
        dosage: log.patient_medications?.dosage || "",
        scheduled_date: new Date(log.scheduled_time).toLocaleDateString(),
        scheduled_time: new Date(log.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actual_time: log.actual_time ? new Date(log.actual_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
      }));

      setReportData(formattedLogs);
    } catch (err) {
      console.error("Error fetching reports:", err);
      toast.error("Failed to load reports");
    } finally {
      setReportLoading(false);
    }
  };

  const handleViewReports = (patientId: string) => {
    setSelectedPatient(patientId);
    setShowReports(true);
    fetchPatientReports(patientId);
  };

  const filtered = patients.filter(
    (p) =>
      p.first_name.toLowerCase().includes(search.toLowerCase()) ||
      p.last_name.toLowerCase().includes(search.toLowerCase())
  );

  const missedToday = patients.reduce(
    (sum, p) => sum + p.reminders.filter((r) => r.status === "missed").length,
    0
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl font-bold">
          <span className="gradient-text-primary">Caregiver</span> Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Monitor your patients' medication adherence</p>
      </motion.div>

      {/* Add Patient Button */}
      <motion.div variants={item}>
        <button
          onClick={() => setAddPatientOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <Heart className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-xl font-bold">{patients.length}</p>
          <p className="text-[11px] text-muted-foreground">Patients</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Pill className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="font-display text-xl font-bold">
            {patients.reduce((s, p) => s + p.medications.length, 0)}
          </p>
          <p className="text-[11px] text-muted-foreground">Total Meds</p>
        </div>
        <div className="glass-card p-4 text-center">
          <AlertCircle className="mx-auto mb-2 h-5 w-5 text-destructive" />
          <p className="font-display text-xl font-bold">{missedToday}</p>
          <p className="text-[11px] text-muted-foreground">Missed Doses</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients..." className="glass-input w-full pl-10" />
      </motion.div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-semibold">No patients assigned</h3>
          <p className="mt-1 text-sm text-muted-foreground">Add a patient by username to get started.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((patient) => (
            <motion.div key={patient.patient_id} variants={item} className="glass-card-hover overflow-hidden">
              <button
                onClick={() => setSelectedPatient(selectedPatient === patient.patient_id ? null : patient.patient_id)}
                className="flex w-full items-center gap-3 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{patient.first_name} {patient.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient.medications.length} meds · {patient.reminders.filter((r) => r.status === "missed").length} missed
                  </p>
                </div>
                {patient.reminders.some((r) => r.status === "missed") && (
                  <Bell className="h-4 w-4 animate-pulse text-destructive" />
                )}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedPatient === patient.patient_id ? "rotate-90" : ""}`} />
              </button>

              {selectedPatient === patient.patient_id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/[0.04] px-4 pb-4">
                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewReports(patient.patient_id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <FileText className="h-3.5 w-3.5" /> View Reports
                    </button>
                  </div>

                  {/* Medications */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Medications</p>
                    <button
                      onClick={() => { setAddMedPatientId(patient.patient_id); setAddMedOpen(true); }}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  {patient.medications.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No medications.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {patient.medications.map((med) => (
                        <div key={med.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                          <div>
                            <p className="text-sm font-medium">{med.medication_name} <span className="text-muted-foreground">{med.dosage}</span></p>
                            <p className="text-xs text-muted-foreground">{med.frequency}</p>
                          </div>
                          <span className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${med.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {med.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent Reminders */}
                  <p className="mt-4 text-xs font-medium text-muted-foreground">Recent Reminders</p>
                  {patient.reminders.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No reminders yet.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {patient.reminders.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                          {statusIcon[r.status as keyof typeof statusIcon] || statusIcon.pending}
                          <span className="flex-1 text-xs">{r.medication_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.scheduled_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Medication Dialog */}
      <AddMedicationDialog open={addMedOpen} onOpenChange={setAddMedOpen} patientId={addMedPatientId} onSuccess={fetchData} />

      {/* Add Patient Dialog */}
      {addPatientOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setAddPatientOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-card p-6 m-4"
          >
            <h3 className="font-display text-lg font-bold mb-4">Add Patient</h3>
            <p className="text-sm text-muted-foreground mb-4">Enter the patient's username to add them to your care list.</p>
            <input
              value={newPatientUsername}
              onChange={(e) => setNewPatientUsername(e.target.value)}
              placeholder="Enter username..."
              className="glass-input w-full mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setAddPatientOpen(false)}
                className="flex-1 rounded-xl py-3 text-sm font-medium text-muted-foreground border border-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPatient}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Add Patient
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Patient Reports Modal */}
      {showReports && selectedPatient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReports(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="h-[80vh] w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-card m-4 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReports(false)}
                  className="rounded-lg p-2 hover:bg-white/[0.08]"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="font-display text-lg font-bold">Patient Reports</h3>
                  <p className="text-xs text-muted-foreground">View medication adherence history</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={reportDateRange}
                  onChange={(e) => { setReportDateRange(e.target.value as any); fetchPatientReports(selectedPatient); }}
                  className="glass-input rounded-lg px-3 py-2 text-sm"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 border-b border-white/[0.08] p-4">
              <div className="text-center">
                <p className="font-display text-2xl font-bold">{reportData.filter(r => r.status === 'taken' || r.status === 'late').length}</p>
                <p className="text-xs text-muted-foreground">Taken</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-destructive">{reportData.filter(r => r.status === 'missed').length}</p>
                <p className="text-xs text-muted-foreground">Missed</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold text-warning">{reportData.filter(r => r.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="font-display text-2xl font-bold">
                  {reportData.length > 0 
                    ? Math.round((reportData.filter(r => r.status === 'taken' || r.status === 'late').length / reportData.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Adherence</p>
              </div>
            </div>

            {/* Report List */}
            <div className="flex-1 overflow-y-auto p-4">
              {reportLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">Loading reports...</p>
                </div>
              ) : reportData.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">No data available for selected period</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reportData.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      {log.status === 'taken' && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {log.status === 'late' && <Clock className="h-5 w-5 text-orange-500" />}
                      {log.status === 'missed' && <XCircle className="h-5 w-5 text-destructive" />}
                      {log.status === 'pending' && <Clock className="h-5 w-5 text-warning" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.medication_name}</p>
                        <p className="text-xs text-muted-foreground">{log.dosage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs">{log.scheduled_date}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.actual_time ? `${log.actual_time} (${log.status})` : log.scheduled_time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CaregiverDashboard;
