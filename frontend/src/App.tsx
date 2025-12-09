import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import CustomerList from "./components/CustomerList";
import LoanPastDueReports from "./components/LoanPastDueReports";

function AppContent() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <Routes>
        {/* Public route - Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/customer-list" replace />
            ) : (
              <Login />
            )
          }
        />

        {/* Protected routes - Require authentication */}
        <Route
          path="/customer-list"
          element={
            <ProtectedRoute>
              <Layout userName={user?.name || user?.user_name || "User"}>
                <CustomerList />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/loan-pastdue-reports"
          element={
            <ProtectedRoute>
              <Layout userName={user?.name || user?.user_name || "User"}>
                <LoanPastDueReports />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? "/customer-list" : "/login"}
              replace
            />
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
