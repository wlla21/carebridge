import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Chat() {
  const navigate = useNavigate();
  const isStaff = ["doctor", "service_worker", "admin"].includes(
    localStorage.getItem("carebridge.role"),
  );
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLogout = () => {
    localStorage.removeItem("carebridge.authenticated");
    localStorage.removeItem("carebridge.token");
    localStorage.removeItem("carebridge.role");
    navigate("/login", { replace: true });
  };

  const askAI = async () => {
    const userMessage = prompt.trim();
    if (!userMessage || loading) return;

    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: userMessage },
    ]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("carebridge.token")}`,
        },
        body: JSON.stringify({ prompt: userMessage }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.detail || `Request failed with status ${response.status}`,
        );
      }
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askAI();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CareBridge</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Private healthcare support
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isStaff ? "Worker dashboard" : "My wellbeing"}
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-89px)] max-w-4xl flex-col px-4 py-8 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
              +
            </div>
            <h2             className="text-4xl font-bold text-gray-900 dark:text-white">
              How can we help?
            </h2>
            <p className="mt-3 max-w-xl text-gray-600 dark:text-slate-400">
              Start a private conversation about your healthcare support needs.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-6 pb-8">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
                    +
                  </div>
                )}
                <div
                  className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 leading-7 ${
                    message.role === "user"
                      ? "rounded-2xl rounded-br-md bg-blue-600 text-white"
                      : "rounded-2xl rounded-bl-md bg-white text-gray-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-lg">
                  +
                </div>
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </div>
        )}

        <div className="sticky bottom-0 mt-4 bg-gray-100 pb-2 pt-3 dark:bg-slate-950">
          <div className="rounded-2xl border border-gray-300 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Message CareBridge..."
              rows={1}
              disabled={loading}
              className="max-h-32 min-h-12 w-full resize-none rounded-xl bg-transparent px-3 py-3 text-gray-900 outline-none placeholder-gray-400 disabled:bg-gray-50 dark:text-slate-100 dark:placeholder-slate-500 dark:disabled:bg-slate-800"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Enter to send - Shift+Enter for a new line
              </p>
              <button
                onClick={askAI}
                disabled={loading || !prompt.trim()}
                aria-label="Send message"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;
