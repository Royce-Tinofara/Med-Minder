import { motion } from "framer-motion";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Timer,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

interface ReminderLog {
  id: string;
  medication_id: string;
  scheduled_time: string;
  actual_time: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  medication_name?: string;
  dosage?: string;
  times?: string[];
  route?: string;
  instructions?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  times: string[];
  route: string;
  instructions: string;
}

const statusConfig = {
  taken: { label: "Taken", className: "bg-success/10 text-success" },
  missed: { label: "Missed", className: "bg-destructive/10 text-destructive" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning" },
  snoozed: { label: "Snoozed", className: "bg-accent/10 text-accent" },
  late: { label: "Late", className: "bg-orange-500/10 text-orange-500" },
  early: { label: "Early", className: "bg-blue-500/10 text-blue-500" },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Reports = () => {
  const { userId, profile } = useAuth();
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [medicationFilter, setMedicationFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Get active medications with their details
      const { data: medsData, error: medsError } = await supabase
        .from("patient_medications")
        .select(`
          id,
          dosage,
          times,
          instructions,
          medication_id,
          medications(name)
        `)
        .eq("patient_id", userId)
        .eq("status", "active");

      if (medsError) throw medsError;

      const formattedMeds = (medsData || []).map((med: any) => ({
        id: med.id,
        name: med.medications?.name || "Unknown",
        dosage: med.dosage,
        times: med.times || [],
        route: med.route || "Oral",
        instructions: med.instructions || "-",
      }));
      setMedications(formattedMeds);

      // Get reminder logs for the selected month
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);

      // Fetch reminder logs with related medication data
      const { data: logsData, error: logsError } = await supabase
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
        .eq("patient_id", userId)
        .gte("scheduled_time", monthStart.toISOString())
        .lte("scheduled_time", monthEnd.toISOString())
        .order("scheduled_time", { ascending: false });

      if (logsError) {
        console.error("Error fetching reminder logs:", logsError);
        setLogs([]);
        setLoading(false);
        return;
      }

      const formattedLogs = (logsData || []).map((log: any) => ({
        ...log,
        medication_name: log.patient_medications?.medications?.name || "Unknown",
        dosage: log.patient_medications?.dosage || "",
        route: "Oral",
        instructions: "-",
      }));
      setLogs(formattedLogs);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (medicationFilter !== "all" && log.medication_name !== medicationFilter) return false;
    if (dateFilter && !log.scheduled_time.startsWith(dateFilter)) return false;
    return true;
  });

  // Get unique medication names for filter
  const medicationNames = [...new Set(logs.map((l) => l.medication_name).filter(Boolean))];

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredLogs.map((log) => ({
      "Medication": log.medication_name || "Unknown",
      "Dosage": log.dosage || "-",
      "Route": log.route || "Oral",
      "Scheduled Time": format(parseISO(log.scheduled_time), "yyyy-MM-dd HH:mm"),
      "Actual Time": log.actual_time ? format(parseISO(log.actual_time), "yyyy-MM-dd HH:mm") : "-",
      "Status": log.status?.toUpperCase() || "-",
      "Instructions": log.instructions || "-",
      "Notes": log.notes || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Medication Report");
    XLSX.writeFile(workbook, `medication-report-${format(selectedMonth, "yyyy-MM")}.xlsx`);
    toast.success("Exported to Excel successfully!");
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Medication Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Month: ${format(selectedMonth, "MMMM yyyy")}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 14, 36);

    let yPos = 50;
    const pageHeight = doc.internal.pageSize.height;

    // Table header
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const headers = ["Medication", "Dosage", "Scheduled", "Actual", "Status"];
    const colWidths = [40, 25, 30, 30, 25];
    let xPos = 14;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 8;

    // Table content
    doc.setFont("helvetica", "normal");
    filteredLogs.forEach((log) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      xPos = 14;
      doc.text((log.medication_name || "Unknown").substring(0, 15), xPos, yPos);
      xPos += colWidths[0];
      doc.text((log.dosage || "-").substring(0, 10), xPos, yPos);
      xPos += colWidths[1];
      doc.text(format(parseISO(log.scheduled_time), "MM/dd HH:mm"), xPos, yPos);
      xPos += colWidths[2];
      doc.text(log.actual_time ? format(parseISO(log.actual_time), "MM/dd HH:mm") : "-", xPos, yPos);
      xPos += colWidths[3];
      doc.text((log.status || "-").toUpperCase(), xPos, yPos);
      yPos += 7;
    });

    doc.save(`medication-report-${format(selectedMonth, "yyyy-MM")}.pdf`);
    toast.success("Exported to PDF successfully!");
  };

  // Calculate stats
  const totalLogs = filteredLogs.length;
  const takenCount = filteredLogs.filter((l) => l.status === "taken" || l.status === "late" || l.status === "early").length;
  const missedCount = filteredLogs.filter((l) => l.status === "missed").length;
  const pendingCount = filteredLogs.filter((l) => l.status === "pending" || l.status === "snoozed").length;
  const adherenceRate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Medication Report</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading..." : `${totalLogs} records for ${format(selectedMonth, "MMMM yyyy")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 rounded-xl bg-success/20 px-4 py-2 text-sm font-medium text-success hover:bg-success/30"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 rounded-xl bg-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/30"
          >
            <FileText className="h-4 w-4" />
            PDF
          </button>
        </div>
      </motion.div>

      {/* Month Selector */}
      <motion.div variants={item} className="glass-card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)))}
            className="rounded-xl p-2 hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="font-display text-lg font-semibold">{format(selectedMonth, "MMMM yyyy")}</h2>
          <button
            onClick={() => setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() + 1)))}
            className="rounded-xl p-2 hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display text-2xl font-bold">{totalLogs}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Taken</p>
          <p className="font-display text-2xl font-bold text-success">{takenCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Missed</p>
          <p className="font-display text-2xl font-bold text-destructive">{missedCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Adherence</p>
          <p className={`font-display text-2xl font-bold ${adherenceRate >= 80 ? "text-success" : adherenceRate >= 60 ? "text-warning" : "text-destructive"}`}>
            {adherenceRate}%
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="taken">Taken</option>
            <option value="late">Late</option>
            <option value="missed">Missed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <select
          value={medicationFilter}
          onChange={(e) => setMedicationFilter(e.target.value)}
          className="glass-input rounded-xl px-3 py-2 text-sm"
        >
          <option value="all">All Medications</option>
          {medicationNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/[0.08] bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Medication</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Dosage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Scheduled</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Actual</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Route</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Instructions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const config = statusConfig[log.status as keyof typeof statusConfig] || statusConfig.pending;
                  return (
                    <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(parseISO(log.scheduled_time), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {log.medication_name || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.dosage || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {format(parseISO(log.scheduled_time), "MMM d, HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.actual_time ? format(parseISO(log.actual_time), "MMM d, HH:mm") : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.route || "Oral"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.instructions || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Reports;
