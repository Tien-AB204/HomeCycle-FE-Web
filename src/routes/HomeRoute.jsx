import { useAuth } from "../hooks/useAuth";
import Homepage from "../pages/public/Homepage";

const HomeRoute = () => {
  const { isAuthInitializing } = useAuth();

  if (isAuthInitializing) {
    return null;
  }

  return <Homepage />;
};

export default HomeRoute;