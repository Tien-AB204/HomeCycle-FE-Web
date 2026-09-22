import { Navigate } from "react-router-dom";
import { getClientEntryPath } from "../constants/clientNavigation";
import { useAuth } from "../hooks/useAuth";
import { normalizeRole } from "../utils/authUtils";

const ClientEntryRoute = () => {
  const { user } = useAuth();
  return <Navigate to={getClientEntryPath(normalizeRole(user?.role))} replace />;
};

export default ClientEntryRoute;
