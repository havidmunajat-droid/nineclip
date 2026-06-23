import type { CurrentUser, PrimaryRole } from "./types";

export type OnboardingIntent = "tool" | "brand" | "clipper";

/**
 * Halaman tujuan setelah register sesuai jalur masuk (intent).
 * Brand → wizard campaign, Clipper → isi DNA, Tool → buat project.
 */
export function onboardingPathFor(intent: OnboardingIntent): string {
  switch (intent) {
    case "brand":
      return "/campaign/new";
    case "clipper":
      return "/clipper/setup";
    default:
      return "/new";
  }
}

/**
 * Dashboard default berdasarkan intent pertama (primaryRole).
 * Brand → /campaign, Clipper → /clipper/campaigns, Tool → /dashboard
 * (home tool mode lama yang menampilkan daftar project).
 */
export function dashboardPathFor(role: PrimaryRole | CurrentUser): string {
  const r = typeof role === "string" ? role : role.primaryRole;
  switch (r) {
    case "brand":
      return "/campaign";
    case "clipper":
      return "/clipper/campaigns";
    default:
      return "/dashboard";
  }
}
