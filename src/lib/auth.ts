import { cookies } from "next/headers";

const DASHBOARD_COOKIE = "a1mc_dashboard_session";

export async function isDashboardAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.has(DASHBOARD_COOKIE);
}
