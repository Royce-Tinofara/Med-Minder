import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Pill,
  Plus,
  Search,
  ChevronRight,
  AlertCircle,
  UserPlus,
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AddMedicationDialog from "@/components/Medications/AddMedicationDialog";

interface PatientWithMeds {
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
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const PharmacistDashboard = () => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<PatientWithMeds[]>([]);
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

  const fetchPatients = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    try {
      // Get assignments - pharmacists can see assigned patients
      const { data: assignments } = await supabase
        .from("patient_assignments")
        .select("patient_id")
        .eq("assigned_user_id", profile.id)
        .eq("assignment_role", "pharmacist");

      if (!assignments || assignments.length === 0) {
        setPatients([]);
        setLoading(false);
        return;
      }

      const patientIds = assignments.map((a) => a.patient_id);

      // Get profiles for patients from our custom users table
      const { data: patientProfiles } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", patientIds);

      // Get medications for these patients
      const { data: meds } = await (supabase as any)
        .from("patient_medications")
        .select("id, patient_id, dosage, frequency, status, quantity_remaining, total_quantity, medication_id")
        .in("patient_id", patientIds);

      // Get medication details separately
      const medIds = [...new Set((meds || []).map((m: any) => m.medication_id))] as string[];
      const { data: medDetails } = await supabase
        .from("medications")
        .select("id, name")
        .in("id", medIds);

      // Create a map for quick lookup
      const medIdToName = new Map();
      (medDetails || []).forEach((m: any) => {
        medIdToName.set(m.id, m.name || "Unknown");
      });

      const patientsMap: PatientWithMeds[] = (patientProfiles || []).map((p) => ({
        patient_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        medications: (meds || [])
          .filter((m: any) => m.patient_id === p.id)
          .map((m: any) => ({
            id: m.id,
            medication_name: medIdToName.get(m.medication_id) || "Unknown",
            dosage: m.dosage,
            frequency: m.frequency,
            status: m.status,
            quantity_remaining: m.quantity_remaining,
            total_quantity: m.total_quantity,
          })),
      }));

      setPatients(patientsMap);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Add new patient to pharmacist's list
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
          assignment_role: "pharmacist",
          permissions: ["view_medications", "add_medications", "request_refill"],
        });

      if (assignError) {
        toast.error("Failed to add patient: " + assignError.message);
        return;
      }

      toast.success(`${patient.first_name} ${patient.last_name} added to your pharmacy!`);
      setAddPatientOpen(false);
      setNewPatientUsername("");
      fetchPatients();
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

      // Get reminder logs for this patient
      const { data: logs } = await (supabase as any)
        .from("reminder_logs")
        .select("id, medication_id, scheduled_time, actual_time, status, notes, created_at")
        .eq("patient_id", patientId)
        .gte("scheduled_time", startDate.toISOString())
        .order("scheduled_time", { ascending: false });

      if (!logs || logs.length === 0) {
        setReportData([]);
        setReportLoading(false);
        return;
      }

      // Get medication details
      const medicationIds = [...new Set(logs.map((l: any) => l.medication_id))];
      const { data: medsData } = await (supabase as any)
        .from("patient_medications")
        .select("id, medications(name, dosage)")
        .in("id", medicationIds);

      const medsMap = new Map();
      (medsData || []).forEach((med: any) => {
        medsMap.set(med.id, med.medications);
      });

      // Combine data
      const formattedLogs = (logs || []).map((log: any) => ({
        ...log,
        medication_name: medsMap.get(log.medication_id)?.name || "Unknown",
        dosage: medsMap.get(log.medication_id)?.dosage || "",
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

  const totalMeds = patients.reduce((sum, p) => sum + p.medications.length, 0);
  const lowSupply = patients.reduce(
    (sum, p) =>
      sum +
      p.medications.filter(
        (m) => m.total_quantity && m.quantity_remaining && m.quantity_remaining / m.total_quantity < 0.2
      ).length,
    0
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="font-display text-2xl font-bold">
          <span className="gradient-text-accent">Pharmacy</span> Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Monitor and manage patient medications</p>
      </motion.div>

      {/* Add Patient Button */}
      <motion.div variants={item}>
        <button
          onClick={() => setAddPatientOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gradient-accent)" }}
        >
          <UserPlus className="h-4 w-4" />
          Add Patient
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-xl font-bold">{patients.length}</p>
          <p className="text-[11px] text-muted-foreground">Patients</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Pill className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="font-display text-xl font-bold">{totalMeds}</p>
          <p className="text-[11px] text-muted-foreground">Medications</p>
        </div>
        <div className="glass-card p-4 text-center">
          <AlertCircle className="mx-auto mb-2 h-5 w-5 text-destructive" />
          <p className="font-display text-xl font-bold">{lowSupply}</p>
          <p className="text-[11px] text-muted-foreground">Low Supply</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients..."
          className="glass-input w-full pl-10"
        />
      </motion.div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Loading patients...</div>
      ) : filtered.length === 0 ? (
        <motion.div variants={item} className="glass-card p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-display text-lg font-semibold">No patients assigned</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a patient by username to manage their medications.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((patient) => (
            <motion.div key={patient.patient_id} variants={item} className="glass-card-hover overflow-hidden">
              <button
                onClick={() =>
                  setSelectedPatient(
                    selectedPatient === patient.patient_id ? null : patient.patient_id
                  )
                }
                className="flex w-full items-center gap-3 p-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-accent-foreground" style={{ background: "var(--gradient-accent)" }}>
                  {patient.first_name[0]}{patient.last_name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">
                    {patient.first_name} {patient.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {patient.medications.length} medications
                  </p>
                </div>
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    selectedPatient === patient.patient_id ? "rotate-90" : ""
                  }`}
                />
              </button>

              {selectedPatient === patient.patient_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-white/[0.04] px-4 pb-4"
                >
                  {/* Action Buttons */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleViewReports(patient.patient_id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-accent)" }}
                    >
                      <FileText className="h-3.5 w-3.5" /> View Reports
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Medications</p>
                    <button
                      onClick={() => {
                        setAddMedPatientId(patient.patient_id);
                        setAddMedOpen(true);
                      }}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Plus className="h-3 w-3" /> Add Medication
                    </button>
                  </div>

                  {patient.medications.length === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">No medications yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {patient.medications.map((med) => {
                        const supplyPct =
                          med.total_quantity && med.quantity_remaining
                            ? (med.quantity_remaining / med.total_quantity) * 100
                            : 100;
                        const isLow = supplyPct < 20;
                        return (
                          <div
                            key={med.id}
                            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {med.medication_name}{" "}
                                  <span className="text-muted-foreground">{med.dosage}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{med.frequency}</p>
                              </div>
                              <span
                                className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                                  med.status === "active"
                                    ? "bg-success/10 text-success"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {med.status}
                              </span>
                            </div>
                            {med.total_quantity && med.total_quantity > 0 && (
                              <div className="mt-2">
                                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                                  <span>Supply: {med.quantity_remaining}/{med.total_quantity}</span>
                                  {isLow && (
                                    <span className="text-destructive font-medium">Low supply</span>
                                  )}
                                </div>
                                <div className="h-1 overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isLow ? "bg-destructive" : "bg-primary"
                                    }`}
                                    style={{ width: `${supplyPct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AddMedicationDialog
        open={addMedOpen}
        onOpenChange={setAddMedOpen}
        patientId={addMedPatientId}
        onSuccess={fetchPatients}
      />

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
            <p className="text-sm text-muted-foreground mb-4">Enter the patient's username to add them to your pharmacy.</p>
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
                style={{ background: "var(--gradient-accent)" }}
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

export default PharmacistDashboard;
