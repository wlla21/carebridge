import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Dashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const headers = useMemo(() => ({ Authorization: `Bearer ${localStorage.getItem("carebridge.token")}` }), []);
  const loadUsers = useCallback(() => fetch(`${API_URL}/admin/users`, { headers }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to load users.");
    setUsers(data);
  }).catch((requestError) => setError(requestError.message)), [headers]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (!selected) return;
    fetch(`${API_URL}/admin/users/${selected.id}/dashboard`, { headers })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to load user overview.");
        setDetail(data);
      })
      .catch((requestError) => setError(requestError.message));
  }, [selected, headers]);

  const filteredUsers = useMemo(() => users.filter((user) => user.username.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const logout = () => {
    localStorage.removeItem("carebridge.token");
    localStorage.removeItem("carebridge.role");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-lg font-bold text-white shadow-sm">+</div><div className="min-w-0"><h1 className="truncate text-lg font-bold sm:text-xl">CareBridge Admin</h1><p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Aggregated wellbeing support overview</p></div></div><div className="flex shrink-0 items-center gap-1.5"><ThemeToggle /><button onClick={() => navigate("/")} className="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-3 sm:text-sm"><span className="sm:hidden">Portal</span><span className="hidden sm:inline">Resident portal</span></button><button onClick={logout} className="rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-3 sm:text-sm"><span className="sm:hidden">Exit</span><span className="hidden sm:inline">Log out</span></button></div></div></header>
      <main className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        <section><p className="text-sm font-semibold text-blue-700">Staff dashboard</p><h2 className="mt-1 text-3xl font-bold">People who may need support</h2><p className="mt-2 text-slate-600">Only aggregated, AI-generated wellbeing insights are shown. Private messages are never displayed.</p></section>
        <section className="grid gap-4 sm:grid-cols-3">{[["Registered users", users.length], ["Active users", users.filter((user) => user.status === "Active").length], ["Conversations reviewed", users.reduce((total, user) => total + user.conversations, 0)]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</section>
        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold">User overview</h3><button onClick={loadUsers} className="text-sm font-semibold text-blue-600">Refresh</button></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username" className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" /><div className="mt-4 space-y-2">{filteredUsers.length ? filteredUsers.map((user) => <button key={user.id} onClick={() => setSelected(user)} className={`w-full rounded-xl border p-4 text-left ${selected?.id === user.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex justify-between gap-3"><span className="font-semibold">{user.username}</span><span className="text-xs capitalize text-slate-500">{user.wellbeing_status}</span></div><p className="mt-1 text-xs text-slate-500">{user.conversations} conversations · {user.trend} trend</p></button>) : <p className="py-6 text-sm text-slate-500">No users with wellbeing data yet.</p>}</div></div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">{selected && detail ? <><div className="flex items-start justify-between"><div><h3 className="text-2xl font-bold">{selected.username}</h3><p className="mt-1 text-sm text-slate-500">Privacy-safe user overview</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold capitalize text-blue-800">{selected.wellbeing_status}</span></div><div className="mt-6 rounded-xl bg-slate-50 p-4"><p className="text-sm leading-6 text-slate-700">{detail.summary}</p></div><h4 className="mt-6 font-bold">Wellbeing timeline</h4><div className="mt-4 space-y-3">{detail.conversations.length ? detail.conversations.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><div className="h-3 w-3 rounded-full bg-blue-500" /><div className="flex-1"><p className="font-medium">{item.topic}</p><p className="text-xs text-slate-500">{item.wellbeing} wellbeing · {item.trend} trend · {new Date(item.created_at).toLocaleDateString()}</p></div></div>) : <p className="text-sm text-slate-500">No privacy-safe conversations recorded.</p>}</div></> : <div className="flex h-full min-h-64 items-center justify-center text-center text-slate-500"><p>Select a user to view aggregated wellbeing trends.</p></div>}</div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
