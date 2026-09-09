import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("carebridge.authenticated");
    navigate("/login", { replace: true });
  };

  const askAI = async () => {
    if (!prompt.trim()) return;
    setError("");
    setAnswer("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setAnswer(data.answer);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}{" "}
      <header className="bg-white border-b border-gray-200">
        {" "}
        <div className="max-w-6xl mx-auto px-6 py-5">
          {" "}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CareBridge</h1>
              <p className="mt-1 text-sm text-gray-500">
                Social Problem AI Assistant
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900">How can we help?</h2>

          <p className="mt-3 text-gray-600">
            Ask AI about a social problem and explore possible solutions.
          </p>
        </div>

        {/* Ask AI Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Describe a social problem
          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: How can we reduce bullying in schools?"
            rows={5}
            className="
          w-full
          resize-none
          rounded-xl
          border border-gray-300
          px-4 py-3
          text-gray-900
          placeholder-gray-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:border-transparent
          transition
        "
          />

          <div className="flex justify-end mt-4">
            <button
              onClick={askAI}
              disabled={loading || !prompt.trim()}
              className="
            rounded-xl
            bg-blue-600
            px-6 py-3
            font-semibold
            text-white
            hover:bg-blue-700
            disabled:bg-gray-300
            disabled:cursor-not-allowed
            transition
          "
            >
              {loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="
          mt-6
          rounded-xl
          border border-red-200
          bg-red-50
          p-4
          text-red-700
        "
          >
            {error}
          </div>
        )}

        {/* Answer */}
        {answer && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                🤖
              </div>

              <div>
                <h3 className="font-bold text-gray-900">CareBridge AI</h3>

                <p className="text-xs text-gray-500">Suggested response</p>
              </div>
            </div>

            <div className="text-gray-700 leading-7 whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}

        {/* Example Questions */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Example questions
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "How can we reduce bullying in schools?",
              "How can we reduce poverty?",
              "What causes youth unemployment?",
              "How can we reduce plastic pollution?",
            ].map((question) => (
              <button
                key={question}
                onClick={() => setPrompt(question)}
                className="
              rounded-xl
              border border-gray-200
              bg-white
              p-4
              text-left
              text-sm
              text-gray-600
              hover:border-blue-400
              hover:bg-blue-50
              hover:text-blue-700
              transition
            "
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
