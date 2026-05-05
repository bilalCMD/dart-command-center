"use client";
import { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  TrendingDown,
  Send,
  Save,
  Loader2,
  ChevronRight,
  FileText,
  BadgeCheck,
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
}

export default function AdminPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [salary, setSalary] = useState("");
  const [month, setMonth] = useState("2026-05");
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/payroll/admin")
      .then((r) => r.json())
      .then(setEmployees);
  }, []);

  const saveSalary = async () => {
    if (!selectedEmp || !salary) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/payroll/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmp.id, monthlySalary: salary }),
    });
    if (res.ok) {
      setMsg({ type: "success", text: "Salary saved successfully!" });
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
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/payroll/admin/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedEmp.id, month }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayroll(data);
      setMsg({ type: "success", text: "Payroll generated successfully!" });
    } else {
      setMsg({ type: "error", text: data.error || "Failed to generate payroll." });
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
      setMsg({ type: "success", text: "Payroll published! Employee can now view it." });
      setPayroll({ ...payroll, status: "PUBLISHED" });
    }
    setLoading(false);
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
          <span>Admin</span>
          <ChevronRight size={12} />
          <span>Payroll</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Payroll Management</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Set salaries, generate and publish monthly payroll</p>
      </div>

      <div className="grid grid-cols-12 gap-6 max-w-6xl">
        <div className="col-span-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <Users size={15} className="text-[var(--muted)]" />
              <span className="text-sm font-semibold text-[var(--text)]">Employees</span>
              <span className="ml-auto text-xs text-[var(--muted)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">
                {employees.length}
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {employees.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-[var(--muted)]">No employees found</div>
              )}
              {employees.map((emp) => {
                const active = selectedEmp?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmp(emp);
                      setSalary(emp.salary?.monthlySalary?.toString() || "");
                      setPayroll(null);
                      setMsg(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      background: active ? "var(--surface2)" : "transparent",
                      borderLeft: active ? "3px solid var(--orange)" : "3px solid transparent",
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: "var(--orange, #f97316)" }}
                    >
                      {getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{emp.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{emp.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {emp.salary ? (
                        <span className="text-xs font-semibold text-emerald-600">
                          {(emp.salary.monthlySalary / 1000).toFixed(0)}k
                        </span>
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
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: "var(--orange, #f97316)" }}
                  >
                    {getInitials(selectedEmp.name)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text)]">{selectedEmp.name}</h2>
                    <p className="text-xs text-[var(--muted)]">{selectedEmp.email}</p>
                  </div>
                  {selectedEmp.salary && (
                    <div className="ml-auto text-right">
                      <p className="text-xs text-[var(--muted)]">Current Salary</p>
                      <p className="text-lg font-bold text-emerald-600">
                        PKR {selectedEmp.salary.monthlySalary.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                      Monthly Salary (PKR)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="e.g. 50000"
                        className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[var(--orange)] bg-[var(--surface2,#f8f8f7)]"
                      />
                      <button
                        onClick={saveSalary}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                        style={{ background: "var(--orange, #f97316)" }}
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                      Payroll Month
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[var(--orange)] bg-[var(--surface2,#f8f8f7)]"
                      />
                      <button
                        onClick={generatePayroll}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                        style={{ background: "#7c3aed" }}
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                        Generate
                      </button>
                    </div>
                  </div>
                </div>

                {msg && (
                  <div
                    className={`mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                      msg.type === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {msg.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {msg.text}
                  </div>
                )}
              </div>

              {payroll && (
                <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Payslip Preview</p>
                      <h3 className="text-sm font-bold text-[var(--text)]">{formatMonth(payroll.month)}</h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        payroll.status === "PUBLISHED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {payroll.status === "PUBLISHED" ? "✓ Published" : "Draft"}
                    </span>
                  </div>

                  <div className="p-5">
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

                    <div className="bg-[var(--surface2,#f8f8f7)] rounded-xl p-4 mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[var(--muted)]">Base Salary</span>
                        <span className="font-medium">PKR {payroll.baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-red-500 flex items-center gap-1">
                          <TrendingDown size={13} /> Absent Deductions
                        </span>
                        <span className="font-medium text-red-500">− PKR {payroll.deductions.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                        <span className="font-bold text-[var(--text)]">Net Payable</span>
                        <span className="font-bold text-emerald-600 text-lg">PKR {payroll.finalSalary.toLocaleString()}</span>
                      </div>
                    </div>

                    {payroll.status === "DRAFT" && (
                      <button
                        onClick={publishPayroll}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                        style={{ background: "var(--orange, #f97316)" }}
                      >
                        {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Publish to Employee
                      </button>
                    )}
                    {payroll.status === "PUBLISHED" && (
                      <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium">
                        <BadgeCheck size={16} />
                        Employee can now view this payslip
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