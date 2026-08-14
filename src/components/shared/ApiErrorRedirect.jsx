import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GLOBAL_API_ERROR_EVENT } from "../../utils/globalApiError";

export default function ApiErrorRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleApiError = (event) => {
      navigate("/loi", {
        state: {
          ...(event.detail || {}),
          returnTo: `${location.pathname}${location.search}${location.hash}`,
        },
      });
    };

    window.addEventListener(GLOBAL_API_ERROR_EVENT, handleApiError);
    return () => window.removeEventListener(GLOBAL_API_ERROR_EVENT, handleApiError);
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}
