export const PROJECT_SLUG = import.meta.env.VITE_PROJECT_SLUG?.trim() || "viva-lago";
export const PROJECT_NAME = "Viva Lago";

export const PUBLIC_PROJECT_ROUTE = `/proyecto/${PROJECT_SLUG}`;
export const ADMIN_LOGIN_ROUTE = "/admin/login";
export const ADMIN_DASHBOARD_ROUTE = "/admin/dashboard";
export const ADMIN_LOTES_ROUTE = "/admin/lotes";
export const ADMIN_LOTE_DETAIL_ROUTE = "/admin/lotes/:id";

export const EXPECTED_FIRESTORE_COLLECTIONS = ["lots", "clients", "sales", "visitRequests", "adminActivity"] as const;
