import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sankey, Tooltip, ResponsiveContainer } from "recharts";

// Sample data (would normally come from backend)
const sampleBudget = {
  total: 1000000,
  breakdown: [
    { id: "Education", amount: 400000 },
    { id: "Health", amount: 300000 },
    { id: "Infrastructure", amount: 200000 },
    { id: "Admin", amount: 100000 },
  ],
  projects: [
    {
      id: "School Renovation",
      dept: "Education",
      amount: 200000,
      vendor: "ABC Constructions",
      txs: [
        { id: "tx1", amount: 50000, date: "2025-09-01", notes: "Advance payment" },
        { id: "tx2", amount: 150000, date: "2025-09-05", notes: "Completion" },
      ],
    },
    {
      id: "Scholarships",
      dept: "Education",
      amount: 200000,
      vendor: "State Edu Fund",
      txs: [
        { id: "tx3", amount: 100000, date: "2025-09-03", notes: "First tranche" },
        { id: "tx4", amount: 100000, date: "2025-09-07", notes: "Second tranche" },
      ],
    },
    {
      id: "Clinic Setup",
      dept: "Health",
      amount: 300000,
      vendor: "MediSupplies",
      txs: [
        { id: "tx5", amount: 150000, date: "2025-09-02", notes: "Equipment" },
        { id: "tx6", amount: 150000, date: "2025-09-08", notes: "Installation" },
      ],
    },
    {
      id: "Road Repair",
      dept: "Infrastructure",
      amount: 200000,
      vendor: "RoadWorks Pvt Ltd",
      txs: [
        { id: "tx7", amount: 200000, date: "2025-09-04", notes: "Contract amount" },
      ],
    },
  ],
};

// Helper: simple SHA-256 hash using Web Crypto
async function sha256hex(message) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function App() {
  const [budget] = useState(sampleBudget);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [uploaded, setUploaded] = useState([]);
  const [verifyLog, setVerifyLog] = useState([]);
  const [sankeyData, setSankeyData] = useState(null);

  useEffect(() => {
    const nodes = [
      { name: "Budget" },
      ...budget.breakdown.map((b) => ({ name: b.id })),
      ...budget.projects.map((p) => ({ name: p.id })),
    ];
    const nodeIndex = (name) => nodes.findIndex((n) => n.name === name);
    const links = [];

    budget.breakdown.forEach((b) => {
      links.push({ source: 0, target: nodeIndex(b.id), value: b.amount });
    });
    budget.projects.forEach((p) => {
      links.push({ source: nodeIndex(p.dept), target: nodeIndex(p.id), value: p.amount });
    });

    setSankeyData({ nodes, links });
  }, [budget]);

  const handleFile = async (file) => {
    const text = await file.text();
    let parsed;
    try {
      if (file.name.endsWith(".json")) parsed = JSON.parse(text);
      else {
        const lines = text.trim().split(/\r?\n/);
        const headers = lines.shift().split(",").map((h) => h.trim());
        parsed = lines.map((ln) => {
          const cols = ln.split(",").map((c) => c.trim());
          const obj = {};
          headers.forEach((h, i) => (obj[h] = cols[i]));
          return obj;
        });
      }
      const entry = { id: `up_${Date.now()}`, name: file.name, payload: parsed };
      const sig = await sha256hex(JSON.stringify(parsed) + "|signed-by-fintrust-demo");
      entry.signature = sig;
      setUploaded((s) => [entry, ...s]);
      setVerifyLog((v) => [
        { id: entry.id, ok: true, signature: sig, file: file.name, time: new Date().toISOString() },
        ...v,
      ]);
    } catch (e) {
      setVerifyLog((v) => [
        { id: `err_${Date.now()}`, ok: false, file: file.name, error: e.message, time: new Date().toISOString() },
        ...v,
      ]);
    }
  };

  const verifyRecord = async (record) => {
    try {
      const expected = await sha256hex(JSON.stringify(record.payload) + "|signed-by-fintrust-demo");
      const ok = expected === record.signature;
      setVerifyLog((v) => [
        { id: `v_${Date.now()}`, ok, signature: record.signature, expected, file: record.name, time: new Date().toISOString() },
        ...v,
      ]);
    } catch (e) {
      setVerifyLog((v) => [
        { id: `verr_${Date.now()}`, ok: false, file: record.name, error: e.message, time: new Date().toISOString() },
        ...v,
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">FinTrust — Institutional Money Transparency</h1>
            <p className="text-sm text-gray-600 mt-1">
              Visualize budgets, trace transactions, and verify authenticity (demo).
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">BNB2025 — State Level (Karnataka)</div>
            <div className="mt-1 text-sm font-medium">Team Demo</div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Upload & Verify */}
        <section className="col-span-1 bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-lg">Upload financial data</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload CSV or JSON exports from accounting systems. The demo computes a checksum to simulate an immutable audit.
          </p>

          <div className="mt-4">
            <input
              id="fileInput"
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="block w-full text-sm text-gray-600"
            />
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Uploaded records</h3>
            {uploaded.length === 0 && <div className="text-sm text-gray-500 mt-2">No uploads yet.</div>}
            <ul className="mt-2 space-y-2">
              {uploaded.map((u) => (
                <li key={u.id} className="p-2 bg-gray-50 rounded-md flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">{u.name}</div>
                    <div className="text-xs text-gray-500">sig: {u.signature?.slice(0, 12)}...</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => verifyRecord(u)}
                      className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm"
                    >
                      Verify
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Verification log</h3>
            <ul className="text-xs mt-2 space-y-2 max-h-48 overflow-y-auto">
              {verifyLog.map((l) => (
                <li key={l.id} className={`p-2 rounded-md ${l.ok ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex justify-between">
                    <div>{l.file}</div>
                    <div className="text-gray-500">{new Date(l.time).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {l.ok ? `OK — signature ${l.signature?.slice(0, 12)}...` : `ERR ${l.error || ""}`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Middle column: Visual Explorer */}
        <section className="col-span-2 bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-lg">Budget Explorer</h2>
              <p className="text-sm text-gray-500 mt-1">
                Interactive view of how the top-level budget flows into departments and projects.
              </p>
            </div>
            <div className="text-sm text-gray-600">Total budget: ₹{budget.total.toLocaleString()}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium">Departments</h4>
              <div className="mt-3 space-y-3">
                {budget.breakdown.map((d) => (
                  <motion.button
                    key={d.id}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full text-left p-3 rounded-lg border flex justify-between items-center ${
                      selectedDept === d.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100 bg-white"
                    }`}
                    onClick={() => {
                      setSelectedDept(d.id);
                      setSelectedProject(null);
                    }}
                  >
                    <div>
                      <div className="font-medium">{d.id}</div>
                      <div className="text-xs text-gray-500">₹{d.amount.toLocaleString()}</div>
                    </div>
                    <div className="text-sm text-gray-700">→</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="h-72 bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium">Projects</h4>
              <div className="mt-3 space-y-3 max-h-56 overflow-y-auto">
                {budget.projects
                  .filter((p) => (selectedDept ? p.dept === selectedDept : true))
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border ${
                        selectedProject === p.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{p.id}</div>
                          <div className="text-xs text-gray-500">
                            Dept: {p.dept} • Vendor: {p.vendor}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">₹{p.amount.toLocaleString()}</div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setSelectedProject(p.id)}
                          className="px-2 py-1 text-sm border rounded-md"
                        >
                          View
                        </button>
                        <button
                          onClick={async () => {
                            const combined = JSON.stringify(p.txs || []) + "|" + p.id;
                            const sig = await sha256hex(combined);
                            setVerifyLog((v) => [
                              {
                                id: `pver_${Date.now()}`,
                                ok: true,
                                signature: sig,
                                file: p.id,
                                time: new Date().toISOString(),
                              },
                              ...v,
                            ]);
                          }}
                          className="px-2 py-1 text-sm border rounded-md"
                        >
                          Quick verify
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="col-span-2 bg-white p-3 rounded-lg border">
              <h4 className="font-medium">Flow visualization</h4>
              <div className="mt-2 h-64">
                {sankeyData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={sankeyData}
                      nodePadding={20}
                      nodeWidth={12}
                      link={{ stroke: "#888" }}
                    >
                      <Tooltip />
                    </Sankey>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-gray-500">No diagram available</div>
                )}
              </div>
            </div>

            <div className="col-span-2 bg-gray-50 p-3 rounded-lg border">
              <h4 className="font-medium">Project transactions</h4>
              {selectedProject ? (
                <div className="mt-2">
                  {budget.projects
                    .find((p) => p.id === selectedProject)
                    .txs.map((t) => (
                      <div key={t.id} className="p-2 border-b flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{t.notes}</div>
                          <div className="text-xs text-gray-500">
                            {t.date} • tx id: {t.id}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">₹{t.amount.toLocaleString()}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">
                  Select a project to see its transactions.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-6 text-center text-xs text-gray-500">
        Built for BNB2025 — Demo only. For production, integrate identity, signed ledgers, and a backend audit service.
      </footer>
    </div>
  );
}
