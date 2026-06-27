"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/new", label: "Project Baru", icon: Plus },
  { href: "/billing", label: "Langganan", icon: CreditCard },
  { href: "/account", label: "Pengaturan", icon: Settings },
];

export function Topbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { inviteCount } = useNotifications();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/10 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        className="flex size-9 items-center justify-center rounded-lg hover:bg-secondary lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
      >
        <Menu className="size-5" />
      </button>

      <Link href="/dashboard" className="lg:hidden">
        <Logo size="sm" />
      </Link>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/new">
            <Plus className="size-4" /> Project baru
          </Link>
        </Button>
        <Link
          href="/clipper/campaigns"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="size-5" />
          {inviteCount > 0 ? (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-lime text-[9px] font-bold text-[hsl(80_60%_6%)]">
              {inviteCount > 9 ? "9+" : inviteCount}
            </span>
          ) : (
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-lime/40" />
          )}
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 py-1.5 pl-1.5 pr-3">
          <Avatar className="size-7">
            <AvatarFallback>{user?.initials ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-xs font-semibold">{user?.name ?? ""}</div>
            <div className="text-[10px] text-lime">{user?.planName ?? ""}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Keluar"
          title="Keluar"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-card p-4">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                className="flex size-9 items-center justify-center rounded-lg hover:bg-secondary"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-lime/15 text-lime"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Badge variant="muted" className="mt-6 w-fit">
              {user?.minutesUsed ?? 0}/{user?.minutesQuota ?? 0} menit terpakai
            </Badge>
          </div>
        </div>
      )}
    </header>
  );
}
