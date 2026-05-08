"use client";
import { useEffect, useState } from "react";

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

export default function EmployeePayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payroll/my")
      .then((r) => r.json())
      .then((data) => {
        setPayrolls(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (payrolls.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">My Payslip</h1>
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-gray-400 text-lg">No payslips available yet.</p>
          <p className="text-gray-400 text-sm mt-2">Your admin has not published any payroll yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Payslip</h1>

      <div className="space-y-4">
        {payrolls.map((payroll) => (
          <div key={payroll.id} className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">{payroll.month}</h2>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                Published
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Base Salary</p>
                <p className="font-semibold">
                  PKR {payroll.baseSalary.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Working Days</p>
                <p className="font-semibold">{payroll.workingDays}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Present Days</p>
                <p className="font-semibold text-green-600">
                  {payroll.presentDays}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Absent Days</p>
                <p className="font-semibold text-red-500">
                  {payroll.absentDays}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-500">Deductions</p>
                <p className="font-semibold text-red-500">
                  - PKR {payroll.deductions.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-gray-500">Final Salary</p>
                <p className="font-bold text-green-600 text-lg">
                  PKR {payroll.finalSalary.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}