"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FolderOpen,
  LayoutGrid,
  Megaphone,
  Plus,
  Scissors,
  Settings,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutGrid };

const baseNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/projects", label: "Proyek", icon: FolderOpen },
  { href: "/new", label: "Project Baru", icon: Plus },
];

const tailNav: NavItem[] = [
  { href: "/billing", label: "Langganan", icon: CreditCard },
  { href: "/account", label: "Pengaturan", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { inviteCount } = useNotifications();
  const minutesUsed = user?.minutesUsed ?? 0;
  const minutesQuota = user?.minutesQuota ?? 0;
  const usedPct = minutesQuota
    ? Math.round((minutesUsed / minutesQuota) * 100)
    : 0;

  // Menu peran (Section 8) — muncul sesuai is_brand / is_clipper.
  const roleNav: NavItem[] = [];
  if (user?.isBrand) {
    roleNav.push({ href: "/campaign", label: "Campaign Brand", icon: Megaphone });
    roleNav.push({ href: "/wallet", label: "Wallet", icon: Wallet });
  }
  if (user?.isClipper) {
    roleNav.push({ href: "/clipper/campaigns", label: "Kampanye Saya", icon: Scissors });
    roleNav.push({ href: "/clipper/earnings", label: "Earnings", icon: Wallet });
  }
  if (user?.isAdmin) {
    roleNav.push({ href: "/admin/withdrawals", label: "Admin · Withdrawal", icon: Shield });
    roleNav.push({ href: "/admin/campaigns", label: "Admin · Campaign", icon: Shield });
    roleNav.push({ href: "/admin/verifications", label: "Admin · Verifikasi", icon: Shield });
    roleNav.push({ href: "/admin/users", label: "Admin · User", icon: Shield });
    roleNav.push({ href: "/admin/config", label: "Admin · Konfigurasi", icon: Settings });
  }
  const nav: NavItem[] = [...baseNav, ...roleNav, ...tailNav];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-card/50 p-4 lg:flex">
      <Link href="/dashboard" className="px-2 py-2">
        <Logo />
      </Link>

      <nav className="mt-6 flex flex-col gap-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const showBadge = item.href === "/clipper/campaigns" && inviteCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-lime/15 text-lime"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="size-[18px]" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="flex size-5 items-center justify-center rounded-full bg-lime text-[10px] font-bold text-[hsl(80_60%_6%)]">
                  {inviteCount > 9 ? "9+" : inviteCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {/* quota */}
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Kuota menit</span>
            <span className="font-semibold">
              {minutesUsed}/{minutesQuota}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-gradient-to-r from-lime-deep to-lime"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <Link
            href="/billing"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-lime/15 px-3 py-2 text-xs font-semibold text-lime transition-colors hover:bg-lime/25"
          >
            <Sparkles className="size-3.5" /> Upgrade paket
          </Link>
        </div>
      </div>
    </aside>
  );
}
