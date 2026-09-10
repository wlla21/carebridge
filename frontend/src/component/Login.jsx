import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const demoUsers = [
  { label: "Income support", email: "demo-income@example.com", password: "Demo12345!" },
  { label: "Caregiver stress", email: "demo-caregiver@example.com", password: "Demo12345!" },
  { label: "Student wellbeing", email: "demo-student@example.com", password: "Demo12345!" },
];

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login failed.");
      localStorage.setItem("carebridge.token", data.token);
      localStorage.setItem("carebridge.role", data.role);
      if (remember) localStorage.setItem("carebridge.rememberedEmail", email.trim());
      else localStorage.removeItem("carebridge.rememberedEmail");
      navigate(
        ["doctor", "service_worker", "admin"].includes(data.role)
          ? "/dashboard"
          : "/",
        { replace: true },
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const selectDemoUser = (demoUser) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setError("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <form
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mb-6 text-gray-600">Sign in to use CareBridge.</p>
        <div className="mb-5">
          <label
            htmlFor="email"
            className="mb-2.5 block text-sm font-medium text-gray-700"
          >
            Your email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
            placeholder="name@flowbite.com"
            required
          />
        </div>
        <div className="mb-5">
          <label
            htmlFor="password"
            className="mb-2.5 block text-sm font-medium text-gray-700"
          >
            Your password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
            placeholder="••••••••"
            required
          />
        </div>
        <label htmlFor="remember" className="mb-5 flex items-center">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="h-4 w-4"
          />
          <span className="ms-2 text-sm text-gray-600">Remember my email</span>
        </label>
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </button>
        <div className="mt-6 border-t border-gray-200 pt-5 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Try a demo resident
          </p>
          <div className="mt-3 grid gap-2">
            {demoUsers.map((demoUser) => (
              <button
                key={demoUser.email}
                type="button"
                onClick={() => selectDemoUser(demoUser)}
                className="rounded-lg border border-blue-200 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-200 dark:hover:bg-blue-950"
              >
                {demoUser.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
};

export default Login;
