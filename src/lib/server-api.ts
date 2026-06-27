import type { PlanConfigItem, Plan } from "./types";
import { planConfigToLegacy } from "./mock";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/** Fetch public pricing plans dari backend (server-side, cache 5 menit). */
export async function fetchPublicPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${apiBase}/config/plans`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: PlanConfigItem[] = await res.json();
    return data.map(planConfigToLegacy);
  } catch {
    return [];
  }
}
