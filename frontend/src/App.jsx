import { Navigate, Route, Routes } from "react-router-dom";
import Chat from "./component/Chat";
import Dashboard from "./component/Dashboard";
import Login from "./component/Login";
import Register from "./component/Resigter";
import ResidentDashboard from "./component/ResidentDashboard";

const isAuthenticated = () => Boolean(localStorage.getItem("carebridge.token"));

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/" replace /> : children;
}

function PortalRoute() {
  const role = localStorage.getItem("carebridge.role");
  return ["doctor", "service_worker", "admin"].includes(role)
    ? <Dashboard />
    : <ResidentDashboard />;
}

const App = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PortalRoute />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
