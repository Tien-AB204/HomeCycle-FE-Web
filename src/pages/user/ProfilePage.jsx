import { ROLES } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import { normalizeRole } from "../../utils/authUtils";
import BusinessProfilePage from "./BusinessProfilePage";
import UserProfilePage from "./UserProfilePage";

export default function ProfilePage() {
  const { user } = useAuth();

  if (
    normalizeRole(user?.role) ===
    ROLES.BUSINESS
  ) {
    return <BusinessProfilePage />;
  }

  return <UserProfilePage />;
}
