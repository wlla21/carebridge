import { useEffect, useState } from "react";

function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("carebridge.theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("carebridge.theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark((current) => !current)}
      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export default ThemeToggle;
