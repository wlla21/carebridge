import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const demoDraft = (caseData) => `Household circumstances
${caseData.resident}, ${caseData.age}. ${caseData.summary}

Key needs
${caseData.needs.join(", ")}.

Information provided by resident
The case summary reflects information shared through the CareBridge intake.

Information requiring verification
${caseData.missing.join("; ")}.

Potential referral areas
Income support, healthcare assistance, and family or community support may be relevant.

Suggested next steps for worker review
Confirm the missing information with the resident, verify available options, and decide on appropriate follow-up.`;

function Dashboard() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftSaved, setDraftSaved] = useState(false);

  const loadAnalyses = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/analyses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("carebridge.token")}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`);
      setAnalyses(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/analyses`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("carebridge.token")}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`);
        return data;
      })
      .then((data) => {
        if (!active) return;
        setAnalyses(data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cases = useMemo(() => [
    ...analyses.map((analysis) => ({
      id: `NEW-${analysis.id}`,
      resident: "New resident case",
      age: "Submitted intake",
      status: "NEW",
      summary: analysis.situation_summary,
      needs: [analysis.support_type, analysis.urgency].filter(Boolean),
      indicators: [analysis.recommended_next_steps],
      missing: ["Confirm household circumstances", "Verify support requirements"],
      analysis,
    })),
  ], [analyses]);

  const selectedCase = cases.find((caseData) => caseData.id === selectedId) || cases[0];

  const handleLogout = () => {
    localStorage.removeItem("carebridge.authenticated");
    localStorage.removeItem("carebridge.token");
    localStorage.removeItem("carebridge.role");
    navigate("/login", { replace: true });
  };

  const selectCase = (caseData) => {
    setSelectedId(caseData.id);
    setDraft(demoDraft(caseData));
    setDraftSaved(false);
  };

  const generateDraft = () => {
    if (!selectedCase) return;
    setDraft(demoDraft(selectedCase));
    setDraftSaved(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">C</div>
            <div>
              <h1 className="text-xl font-bold">CareBridge AI</h1>
              <p className="text-xs text-slate-500">Social service worker portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => navigate("/")} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Resident portal</button>
            <button onClick={handleLogout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Log out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-900/10 dark:from-slate-800 dark:via-slate-800 dark:to-blue-950">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Live case workspace
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Review cases with clarity</h2>
            <p className="mt-2 text-sm text-blue-100">AI prepares the path. People make the decision.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-blue-100">Queue</p>
              <p className="text-xl font-bold">{cases.length}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-blue-100">New</p>
              <p className="text-xl font-bold">{analyses.length}</p>
            </div>
            <button onClick={loadAnalyses} className="self-end rounded-xl bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50">Refresh queue</button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <h3 className="font-bold">Case queue</h3>
                <p className="text-xs text-slate-500">{cases.length} submitted cases</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{analyses.length} new</span>
            </div>
            <div className="space-y-2">
              {loading ? <p className="p-2 text-sm text-slate-500">Loading cases...</p> : cases.map((caseData) => (
                <button key={caseData.id} onClick={() => selectCase(caseData)} className={`w-full rounded-xl border p-3 text-left transition ${selectedCase?.id === caseData.id ? "border-blue-300 bg-blue-50" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">{caseData.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${caseData.status === "NEW" || caseData.status === "New" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{caseData.status}</span>
                  </div>
                  <p className="mt-2 font-semibold">{caseData.resident}</p>
                  <p className="mt-1 text-xs text-slate-500">{caseData.age}</p>
                </button>
              ))}
            </div>
            <p className="mt-4 border-t border-slate-100 px-2 pt-3 text-[11px] leading-5 text-slate-500">Only privacy-safe summaries are shown to authorized staff.</p>
          </aside>

          <section className="space-y-5">
            {selectedCase ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Case overview</p>
                      <h3 className="mt-2 text-2xl font-bold">{selectedCase.resident}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedCase.id} · {selectedCase.age}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">{selectedCase.status}</span>
                  </div>
                  <p className="mt-5 rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">{selectedCase.summary}</p>
                  <h4 className="mt-5 font-bold">Potential areas of need</h4>
                  <div className="mt-3 flex flex-wrap gap-2">{selectedCase.needs.map((need) => <span key={need} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">{need}</span>)}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">Information still needed</h3>
                      <p className="mt-1 text-sm text-slate-500">Confirm these details with the resident.</p>
                    </div>
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Add information</button>
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">{selectedCase.missing.map((item) => <li key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">□ {item}</li>)}</ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold">Potential support pathways</h3>
                  <p className="mt-1 text-xs text-slate-500">Prototype support information - verify against current official sources.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {["Income support", "Healthcare assistance", "Family & community support"].map((pathway) => <div key={pathway} className="rounded-xl border border-slate-200 p-3"><p className="font-semibold">{pathway}</p><p className="mt-2 text-xs leading-5 text-slate-500">May be relevant based on the information shared. Final eligibility is determined by the relevant agency.</p><button className="mt-3 text-xs font-bold text-blue-700 hover:underline">Review pathway</button></div>)}
                  </div>
                </div>
              </>
            ) : <div className="rounded-2xl bg-white p-8 text-slate-500">Select a case to review.</div>}
          </section>

          <aside className="space-y-5">
            {selectedCase && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold">AI-assisted indicators</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">These are indicators for review, not automated eligibility or priority decisions.</p>
              <ul className="mt-4 space-y-2">{selectedCase.indicators.map((indicator) => <li key={indicator} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">• {indicator}</li>)}</ul>
              <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">AI assists. Humans decide. Final prioritisation remains with the caseworker.</p>
            </div>}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-bold">AI-generated referral draft</h3><p className="mt-1 text-xs text-slate-500">Review and edit before use.</p></div>
                <button onClick={generateDraft} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Generate</button>
              </div>
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setDraftSaved(false); }} className="mt-4 min-h-72 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" aria-label="Editable referral draft" />
              <div className="mt-3 flex items-center justify-between gap-2">
                <button onClick={() => setDraftSaved(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Save draft</button>
                <button onClick={() => setDraftSaved(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Mark reviewed</button>
              </div>
              {draftSaved && <p className="mt-3 text-xs font-medium text-emerald-700">Draft saved for this demonstration.</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold">Pilot impact</h3>
              <p className="mt-1 text-xs text-slate-500">Illustrative pilot measures - not actual results.</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-700"><p>↓ Intake preparation time</p><p>↑ Complete information at first appointment</p><p>↑ Referral readiness</p><p>↓ Repeated data collection</p></div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
