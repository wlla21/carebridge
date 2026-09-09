import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const tone = {
  low: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-800",
};

function ResidentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/me/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("carebridge.token")}` },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail || "Unable to load your dashboard.");
        return result;
      })
      .then(setData)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const chartMax = useMemo(
    () => Math.max(1, ...(data?.conversations || []).map((item) => item.wellbeing === "high" ? 3 : item.wellbeing === "moderate" ? 2 : 1)),
    [data],
  );

  const logout = () => {
    localStorage.removeItem("carebridge.token");
    localStorage.removeItem("carebridge.role");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div><h1 className="text-xl font-bold">CareBridge</h1><p className="text-xs text-slate-500">Your private wellbeing space</p></div>
          <div className="flex items-center gap-2"><ThemeToggle /><button onClick={logout} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Log out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        {!data && !error && <div className="rounded-2xl bg-white p-8 text-slate-500">Loading your wellbeing overview...</div>}
        {data && (
          <>
            <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-cyan-500 p-7 text-white shadow-lg">
              <p className="text-sm text-blue-100">Welcome back, {data.username}</p>
              <h2 className="mt-2 text-3xl font-bold">Your wellbeing overview</h2>
              <p className="mt-2 max-w-2xl text-sm text-blue-100">Supportive insights from your conversations - not a medical diagnosis.</p>
            </section>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Current wellbeing", data.wellbeing_status],
                ["Recent trend", data.trend],
                ["Conversations", data.total_conversations],
                ["Recent activity", data.recent_activity ? new Date(data.recent_activity).toLocaleDateString() : "None yet"],
              ].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-2xl font-bold capitalize ${label === "Current wellbeing" ? `rounded-full px-3 py-1 text-base inline-block ${tone[value] || "bg-slate-100 text-slate-700"}` : ""}`}>{value}</p></div>)}
            </section>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between"><h3 className="text-lg font-bold">Wellbeing trend</h3><span className="text-xs text-slate-500">Informational</span></div>
                <div className="mt-6 flex h-40 items-end gap-3 border-b border-l border-slate-200 px-3">
                  {data.conversations.length ? data.conversations.slice().reverse().map((item) => {
                    const score = item.wellbeing === "high" ? 3 : item.wellbeing === "moderate" ? 2 : 1;
                    return <div key={item.id} className="flex flex-1 flex-col items-center gap-2"><div title={`${item.wellbeing} wellbeing`} className="w-full max-w-12 rounded-t-lg bg-blue-500" style={{ height: `${(score / chartMax) * 100}%` }} /><span className="text-[10px] text-slate-500">{new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span></div>;
                  }) : <p className="mb-5 text-sm text-slate-500">Start a conversation to build your trend.</p>}
                </div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">Your Recent Wellbeing Summary</h3><p className="mt-3 leading-7 text-slate-600">{data.summary}</p><div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">These insights are supportive and informational, not clinical advice.</div></div>
            </section>
            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">Personalized Suggestions</h3><ul className="mt-4 space-y-3">{(data.suggestions.length ? data.suggestions : ["Continue checking in when you need support."]).map((suggestion) => <li key={suggestion} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">• {suggestion}</li>)}</ul><button onClick={() => navigate("/")} className="mt-5 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">Start a conversation</button></div>
              <div className="rounded-2xl bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">Conversation History</h3><div className="mt-4 space-y-3">{data.conversations.length ? data.conversations.map((conversation) => <div key={conversation.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold">{conversation.title}</h4><p className="mt-1 text-xs text-slate-500">{new Date(conversation.created_at).toLocaleString()} · {conversation.topic}</p></div><span className={`rounded-full px-2 py-1 text-xs font-medium ${tone[conversation.wellbeing] || "bg-slate-100 text-slate-700"}`}>{conversation.wellbeing}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{conversation.summary}</p></div>) : <p className="text-sm text-slate-500">No conversations yet.</p>}</div></div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default ResidentDashboard;
