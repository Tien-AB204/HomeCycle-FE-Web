export const BUSINESS_DISCOVERY_REFRESH_EVENT =
  "homecycle:business-discovery-refresh";

export const notifyBusinessDiscoveryRefresh = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BUSINESS_DISCOVERY_REFRESH_EVENT));
};
