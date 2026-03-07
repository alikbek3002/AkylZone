import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/Login";
import AdminLayout from "./components/layout/AdminLayout";
import StudentsPage from "./pages/Dashboard/Students";
import TestsPage from "./pages/Dashboard/Tests";
import { useAdminAuthStore } from "./store/authStore";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = useAdminAuthStore((state) => Boolean(state.token));
  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const isAdmin = useAdminAuthStore((state) => Boolean(state.token));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAdmin ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={isAdmin ? <Navigate to="/dashboard" replace /> : <AdminLogin />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="students" replace />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="tests" element={<TestsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
