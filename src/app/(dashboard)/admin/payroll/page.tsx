"use client";
import { useEffect, useState } from "react";
import {
  Users, DollarSign, Calendar, CheckCircle, XCircle,
  TrendingDown, Send, Save, Loader2, ChevronRight,
  FileText, BadgeCheck, ClipboardList, Plus, X, ChevronDown, ChevronUp,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  email: string;
  salary: { monthlySalary: number } | null;
}

interface Payroll {
  id: string;
  month: string;
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  workingDays: number;
  deductions: number;
  finalSalary: number;
  status: string;
  manualBonus?: number;
  manualDeduction?: number;
  manualNote?: string;
  deductionBreakdown?: any;
}

interface EODReport {
  id: string;
  date: string;
  content: string;
  createdAt: string;
}

export default function AdminPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [salary, setSalary] = useState("");
  const [month, setMonth] = useState("2026-05");
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // EOD states
  const [eodReports, setEodReports] = useState<EODReport[]>([]);
  const [eodLoading, setEodLoading] = useState(false);
  const [showEOD, setShowEOD] = useState(false);
  const [editingEOD, setEditingEOD] = useState<EODReport | null>(null);
  const [newEODDate, setNewEODDate] = useState("");
  const [newEODContent, setNewEODContent] = useState("");
  const [addingEOD, setAddingEOD] = useState(false);
  const [eodMsg, setEodMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Adjust states
  const [manualBonus, setManualBonus] = useState("0");
  const [manualDeduction, setManualDeduction] = useState("0");
  const [manualNote, setManualNote] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/payroll/admin").then((r) => r.json()).then(setEmployees);
  }, []);

  const fetchEODs = async (userId: string, m: string) => {
    setEodLoading(true);
    try {
      const [y, mon] = m.split("-");
      const from = `${y}-${mon}-01`;
      const lastDay = new Date(Number(y), Number(mon), 0).getDate();
      const to = `${y}-${mon}-${lastDay}`;
      const res = await fetch(`/api/eod/admin?userId=${userId}&from=${from}&to=${to}`);
      const data = await res.json();
      setEodReports(data.reports || []);
    } catch (e) { setEodReports([]); }
    setEodLoading(false);
  };

  const saveSalary = async () => {
    if (!selectedEmp || !salary) return;
    setLoading(true); setMsg(null);
    const res = await fetch("/api/payroll/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmp.id, monthlySalary: salary }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Salary saved!" });
      const updated = await fetch("/api/payroll/admin").then((r) => r.json());
      setEmployees(updated);
      const emp = updated.find((e: Employee) => e.id === selectedEmp.id);
      if (emp) setSelectedEmp(emp);
    } else {
      setMsg({ type: "error", text: "Failed to save salary." });
    }
    setLoading(false);
  };

  const generatePayroll = async () => {
    if (!selectedEmp || !month) return;
    setLoading(true); setMsg(null);
    const res = await fetch("/api/payroll/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmp.id, month }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayroll(data);
      setManualBonus(data.manualBonus?.toString() || "0");
      setManualDeduction(data.manualDeduction?.toString() || "0");
      setManualNote(data.manualNote || "");
      setMsg({ type: "success", text: "Payroll generated!" });
      fetchEODs(selectedEmp.id, month);
      setShowEOD(true);
    } else {
      setMsg({ type: "error", text: data.error || "Failed." });
    }
    setLoading(false);
  };

  const publishPayroll = async () => {
    if (!payroll) return;
    setLoading(true);
    const res = await fetch("/api/payroll/admin/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payrollId: payroll.id }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Payroll published!" });
      setPayroll({ ...payroll, status: "PUBLISHED" });
    }
    setLoading(false);
  };

  const saveAdjustments = async () => {
    if (!payroll) return;
    setAdjustLoading(true); setAdjustMsg(null);
    const res = await fetch('/api/payroll/admin/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payrollId: payroll.id, manualBonus, manualDeduction, manualNote }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayroll(data.payroll);
      setAdjustMsg({ type: 'success', text: 'Adjustments saved & salary recalculated!' });
    } else {
      setAdjustMsg({ type: 'error', text: 'Failed to save.' });
    }
    setAdjustLoading(false);
  };

  const saveEOD = async () => {
    if (!selectedEmp || !newEODDate || !newEODContent.trim()) return;
    setEodLoading(true); setEodMsg(null);
    try {
      const url = editingEOD ? `/api/eod/admin/${editingEOD.id}` : "/api/eod/admin";
      const method = editingEOD ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedEmp.id, date: newEODDate, content: newEODContent }),
      });
      if (res.ok) {
        setEodMsg({ type: "success", text: editingEOD ? "EOD updated!" : "EOD added!" });
        setEditingEOD(null); setNewEODDate(""); setNewEODContent(""); setAddingEOD(false);
        fetchEODs(selectedEmp.id, month);
        setTimeout(() => generatePayroll(), 500);
      } else {
        setEodMsg({ type: "error", text: "Failed to save EOD." });
      }
    } catch (e) { setEodMsg({ type: "error", text: "Network error." }); }
    setEodLoading(false);
  };

  const deleteEOD = async (id: string) => {
    if (!selectedEmp) return;
    setEodLoading(true);
    try {
      await fetch(`/api/eod/admin/${id}`, { method: "DELETE" });
      fetchEODs(selectedEmp.id, month);
      setTimeout(() => generatePayroll(), 500);
    } catch (e) {}
    setEodLoading(false);
  };

  const startEdit = (eod: EODReport) => {
    setEditingEOD(eod);
    setNewEODDate(eod.date.split("T")[0]);
    setNewEODContent(eod.content);
    setAddingEOD(true);
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const formatMonth = (m: string) => {
    const [y, mon] = m.split("-");
    return new Date(Number(y), Number(mon) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg, #f8f8f7)" }}>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1">
          <span>Admin</span><ChevronRight size={12} /><span>Payroll</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Payroll Management</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Set salaries, manage EODs, generate and publish monthly payroll</p>
      </div>

      <div className="grid grid-cols-12 gap-6 max-w-6xl">
        {/* Employee List */}
        <div className="col-span-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <Users size={15} className="text-[var(--muted)]" />
              <span className="text-sm font-semibold text-[var(--text)]">Employees</span>
              <span className="ml-auto text-xs text-[var(--muted)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">{employees.length}</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {employees.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">No employees found</div>
              )}
              {employees.map((emp) => {
                const active = selectedEmp?.id === emp.id;
                return (
                  <button key={emp.id} onClick={() => {
                    setSelectedEmp(emp);
                    setSalary(emp.salary?.monthlySalary?.toString() || "");
                    setPayroll(null); setMsg(null);
                    setEodReports([]); setShowEOD(false);
                    setAddingEOD(false); setEditingEOD(null);
                    setManualBonus("0"); setManualDeduction("0"); setManualNote("");
                  }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: active ? "var(--surface2)" : "transparent", borderLeft: active ? "3px solid var(--orange)" : "3px solid transparent" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "var(--orange, #f97316)" }}>
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{emp.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{emp.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {emp.salary ? (
                        <span className="text-xs font-semibold text-emerald-600">{(emp.salary.monthlySalary / 1000).toFixed(0)}k</span>
                      ) : (
                        <span className="text-xs text-red-400">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-8 flex flex-col gap-5">
          {!selectedEmp ? (
            <div className="bg-white rounded-2xl border border-[var(--border)] flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mb-3">
                <FileText size={24} className="text-[var(--muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text)]">Select an employee</p>
              <p className="text-xs text-[var(--muted)] mt-1">Choose from the list to manage their payroll</p>
            </div>
          ) : (
            <>
              {/* Salary + Generate */}
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: "var(--orange, #f97316)" }}>
                    {getInitials(selectedEmp.name)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text)]">{selectedEmp.name}</h2>
                    <p className="text-xs text-[var(--muted)]">{selectedEmp.email}</p>
                  </div>
                  {selectedEmp.salary && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-[var(--muted)]">Current Salary</p>
                      <p className="text-lg font-bold text-emerald-600">PKR {selectedEmp.salary.monthlySalary.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Monthly Salary (PKR)</label>
                    <div className="flex gap-2">
                      <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)}
                        placeholder="e.g. 50000"
                        className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[var(--orange)] bg-[var(--surface2)]" />
                      <button onClick={saveSalary} disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--orange, #f97316)" }}>
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">Payroll Month</label>
                    <div className="flex gap-2">
                      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                        className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[var(--orange)] bg-[var(--surface2)]" />
                      <button onClick={generatePayroll} disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "#7c3aed" }}>
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />} Generate
                      </button>
                    </div>
                  </div>
                </div>
                {msg && (
                  <div className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    {msg.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />} {msg.text}
                  </div>
                )}
              </div>

              {/* EOD Section */}
              {payroll && (
                <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                  <button onClick={() => setShowEOD(!showEOD)}
                    className="w-full px-5 py-4 border-b border-[var(--border)] flex items-center justify-between hover:bg-[var(--surface2)] transition-colors">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={15} className="text-[var(--orange)]" />
                      <span className="text-sm font-bold text-[var(--text)]">EOD Reports — {formatMonth(month)}</span>
                      <span className="text-xs bg-[var(--surface2)] text-[var(--muted)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                        {eodReports.length} reports
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted)]">Edit to recalculate payroll</span>
                      {showEOD ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
                    </div>
                  </button>

                  {showEOD && (
                    <div className="p-5 space-y-4">
                      {addingEOD ? (
                        <div className="bg-[var(--surface2)] rounded-xl p-4 border border-[var(--border)] space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-[var(--text)]">{editingEOD ? "Edit EOD" : "Add EOD"}</h4>
                            <button onClick={() => { setAddingEOD(false); setEditingEOD(null); setNewEODDate(""); setNewEODContent(""); }}>
                              <X size={14} className="text-[var(--muted)]" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">Date</label>
                              <input type="date" value={newEODDate} onChange={e => setNewEODDate(e.target.value)}
                                className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--orange)]" />
                            </div>
                            <div className="flex items-end">
                              <button onClick={saveEOD} disabled={eodLoading || !newEODDate || !newEODContent.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                                style={{ background: "var(--orange, #f97316)" }}>
                                {eodLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {editingEOD ? "Update" : "Save"}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">EOD Content</label>
                            <textarea value={newEODContent} onChange={e => setNewEODContent(e.target.value)}
                              rows={4} placeholder="What was accomplished today..."
                              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[var(--orange)] resize-none" />
                          </div>
                          {eodMsg && (
                            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${eodMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                              {eodMsg.type === "success" ? <CheckCircle size={12} /> : <XCircle size={12} />} {eodMsg.text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => { setAddingEOD(true); setEditingEOD(null); setNewEODDate(""); setNewEODContent(""); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--orange)] hover:text-[var(--orange)] transition-all">
                          <Plus size={14} /> Add EOD Report
                        </button>
                      )}

                      {eodLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 size={18} className="animate-spin text-[var(--muted)]" />
                        </div>
                      ) : eodReports.length === 0 ? (
                        <div className="text-center py-6 text-sm text-[var(--muted)]">
                          <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
                          No EOD reports for this month
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {eodReports.map((eod) => (
                            <div key={eod.id} className="bg-[var(--surface2)] rounded-xl p-3 border border-[var(--border)]">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <span className="text-xs font-bold text-[var(--orange)]">
                                  {new Date(eod.date).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startEdit(eod)}
                                    className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold">Edit</button>
                                  <button onClick={() => deleteEOD(eod.id)}
                                    className="text-xs px-2 py-0.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold">Delete</button>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{eod.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payroll Preview */}
              {payroll && (
                <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Payslip Preview</p>
                      <h3 className="text-sm font-bold text-[var(--text)]">{formatMonth(payroll.month)}</h3>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${payroll.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {payroll.status === "PUBLISHED" ? "✓ Published" : "Draft"}
                    </span>
                  </div>
                  <div className="p-5">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign size={13} className="text-blue-500" />
                          <span className="text-xs text-blue-500 font-medium">Base Salary</span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text)]">PKR {payroll.baseSalary.toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle size={13} className="text-emerald-500" />
                          <span className="text-xs text-emerald-500 font-medium">Present Days</span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text)]">{payroll.presentDays} / {payroll.workingDays}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle size={13} className="text-red-400" />
                          <span className="text-xs text-red-400 font-medium">Absent Days</span>
                        </div>
                        <p className="text-sm font-bold text-[var(--text)]">{payroll.absentDays}</p>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-[var(--surface2)] rounded-xl p-4 mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--muted)]">Base Salary</span>
                        <span className="font-medium">PKR {payroll.baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-red-500 flex items-center gap-1">
                          <TrendingDown size={13} /> Absent Deductions
                        </span>
                        <span className="font-medium text-red-500">− PKR {payroll.deductions.toLocaleString()}</span>
                      </div>
                      {(payroll.manualBonus || 0) > 0 && (
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-emerald-600">🎁 Manual Bonus</span>
                          <span className="font-medium text-emerald-600">+ PKR {(payroll.manualBonus || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {(payroll.manualDeduction || 0) > 0 && (
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-red-500">✂️ Extra Deduction</span>
                          <span className="font-medium text-red-500">− PKR {(payroll.manualDeduction || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {payroll.manualNote && (
                        <div className="text-xs text-[var(--muted)] italic mb-2">Note: {payroll.manualNote}</div>
                      )}
                      <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                        <span className="font-bold text-[var(--text)]">Net Payable</span>
                        <span className="font-bold text-emerald-600 text-lg">PKR {payroll.finalSalary.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Manual Adjustments */}
                    <div className="border border-[var(--border)] rounded-xl p-4 mb-4 space-y-3">
                      <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5">
                        ✏️ Manual Adjustments
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-emerald-600 mb-1 block">+ Bonus (PKR)</label>
                          <input type="number" value={manualBonus} onChange={e => setManualBonus(e.target.value)}
                            className="w-full border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                            placeholder="0" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-red-500 mb-1 block">− Extra Deduction (PKR)</label>
                          <input type="number" value={manualDeduction} onChange={e => setManualDeduction(e.target.value)}
                            className="w-full border border-red-200 bg-red-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                            placeholder="0" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">Note (optional)</label>
                        <input type="text" value={manualNote} onChange={e => setManualNote(e.target.value)}
                          placeholder="e.g. Performance bonus, advance deduction..."
                          className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--orange)] bg-[var(--surface2)]" />
                      </div>
                      <button onClick={saveAdjustments} disabled={adjustLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: '#7c3aed' }}>
                        {adjustLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save & Recalculate
                      </button>
                      {adjustMsg && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${adjustMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {adjustMsg.type === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {adjustMsg.text}
                        </div>
                      )}
                    </div>

                    {/* Publish */}
                    {payroll.status === "DRAFT" && (
                      <button onClick={publishPayroll} disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--orange, #f97316)" }}>
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Publish to Employee
                      </button>
                    )}
                    {payroll.status === "PUBLISHED" && (
                      <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
                        <BadgeCheck size={16} /> Employee can now view this payslip
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}