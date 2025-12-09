import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatLanguageProvider } from "./contexts/ChatLanguageContext";
import Login from "./components/auth/Login";
import Layout from "./components/layouts/Layout";
import Home from "./components/Pages/Home";
import Team from "./components/Pages/Team";
import ChatUI from "./components/Pages/ChatUI";
import UserRights from "./components/Pages/UserRights";

// import ReportPage from "./components/Pages/ReportPage";
import ReportDesignPage from "./components/Pages/Report&DesignPage";
import DesignReport from "./components/Pages/DesignReport";

import "./App.css";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<Home />} />
        <Route
          path="report"
          element={
            <ProtectedRoute>
              <ReportDesignPage />
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="ui/:reportId"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="design-report"
          element={
            <ProtectedRoute>
              <DesignReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="design/:reportId"
          element={
            <ProtectedRoute>
              <DesignReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="user-rights"
          element={
            <ProtectedRoute>
              <UserRights />
            </ProtectedRoute>
          }
        />
        <Route path="about">
          <Route path="team" element={<Team />} />
        </Route>
        <Route path="chat" element={<ChatUI />} />

        {/* Dynamic routes for ANY base path (transactions, reports, analytics, etc.) */}
        {/* User routes with 3-level paths: /:base/:section/:subsection/:reportId */}
        <Route
          path=":base/:section/:subsection/:reportId"
          element={
            <ProtectedRoute>
              <ReportDesignPage />
            </ProtectedRoute>
          }
        />
        {/* User routes with 2-level paths: /:base/:section/:reportId */}
        <Route
          path=":base/:section/:reportId"
          element={
            <ProtectedRoute>
              <ReportDesignPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ChatLanguageProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </ChatLanguageProvider>
    </AuthProvider>
  );
}

export default App;
