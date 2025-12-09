import CustomerList from "../components/Pages/CustomerList";
import Home from "../components/Pages/Home";
import ChatUI from "../components/Pages/ChatUI";
import UserRights from "../components/Pages/UserRights";
import ReportDesignPage from "../components/Pages/Report&DesignPage";
import DesignReport from "../components/Pages/DesignReport";
import Team from "../components/Pages/Team";

/**
 * Maps database URLs to React components
 * Key: URL pattern from database (e.g., /member-reports/lists/customer-lists)
 * Value: Component to render
 */
export const routeComponentMap = {
  "/home": Home,
  "/dashboard": Home,
  "/member-reports/lists/customer-lists": CustomerList,
  "/chat": ChatUI,
  "/user-rights": UserRights,
  "/report": ReportDesignPage,
  "/design-report": DesignReport,
  "/about/team": Team,
  // Add more mappings as you create components
};

/**
 * Get component for a given URL path
 * @param {string} url - The URL from database
 * @returns {React.Component|null} - The component to render or null
 */
export const getComponentForUrl = (url) => {
  // Try exact match first
  if (routeComponentMap[url]) {
    return routeComponentMap[url];
  }

  // Try partial matching for nested routes
  const routeKeys = Object.keys(routeComponentMap);
  const matchedRoute = routeKeys.find(
    (route) => url.startsWith(route) || route.startsWith(url)
  );

  if (matchedRoute) {
    return routeComponentMap[matchedRoute];
  }

  return null;
};
