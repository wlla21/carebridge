import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    localStorage.setItem("carebridge.authenticated", "true");
    if (remember) {
      localStorage.setItem("carebridge.rememberedEmail", email.trim());
    } else {
      localStorage.removeItem("carebridge.rememberedEmail");
    }
    navigate("/", { replace: true });
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
      </form>
    </main>
  );
};

export default Login;
