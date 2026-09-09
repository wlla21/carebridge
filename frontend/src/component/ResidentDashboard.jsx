import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const emptyCheckIn = { stress: "", sleep: "", pain: "", support: "" };

function ResidentDashboard() {
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("carebridge.checkIn")) || emptyCheckIn;
    } catch {
      return emptyCheckIn;
    }
  });
  const [saved, setSaved] = useState(Boolean(checkIn.stress));

  const update = (field, value) => {
    setCheckIn((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveCheckIn = (event) => {
    event.preventDefault();
    localStorage.setItem("carebridge.checkIn", JSON.stringify(checkIn));
    setSaved(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("carebridge.authenticated");
    localStorage.removeItem("carebridge.token");
    localStorage.removeItem("carebridge.role");
    navigate("/login", { replace: true });
  };

  const stressTone = {
    Low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    Moderate: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    High: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  }[checkIn.stress] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold">CareBridge</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your private wellbeing space</p>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle /><button onClick={handleLogout} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Log out</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-cyan-500 p-6 text-white shadow-lg dark:from-slate-800 dark:to-blue-950">
          <p className="text-sm font-semibold text-blue-100">Personal check-in</p>
          <h2 className="mt-2 text-3xl font-bold">How are you feeling today?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Track how you are feeling and talk privately with CareBridge AI when you need support.</p>
          <button onClick={() => navigate("/")} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Talk to CareBridge AI</button>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={saveCheckIn} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold">Wellbeing check-in</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your answers stay in your account for this prototype.</p></div>{saved && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">Saved</span>}</div>
            <label className="mt-5 block text-sm font-semibold">Stress level</label>
            <div className="mt-2 grid grid-cols-3 gap-2">{["Low", "Moderate", "High"].map((value) => <button key={value} type="button" onClick={() => update("stress", value)} className={`rounded-xl border px-3 py-3 text-sm font-medium ${checkIn.stress === value ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}>{value}</button>)}</div>
            <label htmlFor="sleep" className="mt-5 block text-sm font-semibold">How has your sleep been?</label>
            <select id="sleep" value={checkIn.sleep} onChange={(event) => update("sleep", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select one</option><option>Sleeping well</option><option>Some difficulty</option><option>Very difficult</option></select>
            <label htmlFor="pain" className="mt-5 block text-sm font-semibold">Any physical discomfort?</label>
            <select id="pain" value={checkIn.pain} onChange={(event) => update("pain", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select one</option><option>None</option><option>Mild</option><option>Significant</option></select>
            <label htmlFor="support" className="mt-5 block text-sm font-semibold">What would help most right now?</label>
            <textarea id="support" value={checkIn.support} onChange={(event) => update("support", event.target.value)} rows={3} placeholder="You can describe what you are going through..." className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-3 text-sm dark:border-slate-700" />
            <button type="submit" disabled={!checkIn.stress} className="mt-5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">Save check-in</button>
          </form>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="font-bold">Your latest wellbeing</h3>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><span className="text-sm text-slate-600 dark:text-slate-300">Stress level</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${stressTone}`}>{checkIn.stress || "Not checked in"}</span></div>
              <div className="mt-3 grid gap-3 text-sm"><p className="flex justify-between"><span className="text-slate-500">Sleep</span><strong>{checkIn.sleep || "Not recorded"}</strong></p><p className="flex justify-between"><span className="text-slate-500">Physical discomfort</span><strong>{checkIn.pain || "Not recorded"}</strong></p></div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950"><h3 className="font-bold text-blue-900 dark:text-blue-100">You are not alone</h3><p className="mt-2 text-sm leading-6 text-blue-800 dark:text-blue-200">CareBridge can help you describe what is happening and explore possible next steps. This is not a diagnosis or emergency service.</p><button onClick={() => navigate("/")} className="mt-4 font-semibold text-blue-700 hover:underline dark:text-blue-200">Start a private conversation →</button></div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default ResidentDashboard;
