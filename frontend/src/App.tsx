import { useState } from "react";
import "./App.css";
import Layout from "./components/Layout";
import CustomerList from "./components/CustomerList";

function App() {
  const [currentPage, setCurrentPage] = useState<{
    title: string;
    path: string;
  } | null>(null);

  const handleNavigation = (path: string, title?: string) => {
    console.log("Navigating to:", path);
    setCurrentPage({
      title: title || path.split("/").filter(Boolean).pop() || "Page",
      path: path,
    });
  };

  const handleLogoClick = () => {
    console.log("Logo clicked");
    setCurrentPage(null);
  };

  const handleUserClick = () => {
    console.log("User profile clicked");
  };

  return (
    <Layout
      userName="Admin"
      logoText="AIB Report"
      onNavigate={handleNavigation}
      onLogoClick={handleLogoClick}
      onUserClick={handleUserClick}
    >
      {currentPage?.path === "/customer-list" && <CustomerList />}
    </Layout>
  );
}

export default App;
