import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    age: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          age: form.age ? Number(form.age) : null,
          password: form.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Registration failed.");
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "Cannot connect to the server. Start the CareBridge backend on port 8000 and try again."
          : requestError.message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <form className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm" onSubmit={handleSubmit}>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Create account</h1>
        <p className="mb-6 text-gray-600">Register as a CareBridge user.</p>
        {["username", "email", "age", "password", "confirmPassword"].map((field) => (
          <input
            key={field}
            name={field}
            type={field.includes("password") ? "password" : field === "age" ? "number" : field === "email" ? "email" : "text"}
            value={form[field]}
            onChange={updateField}
            placeholder={field === "confirmPassword" ? "Confirm password" : field[0].toUpperCase() + field.slice(1)}
            required={field !== "age"}
            min={field === "age" ? "1" : undefined}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900"
          />
        ))}
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
        <p className="mt-5 text-center text-sm text-gray-600">
          Already registered?{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
