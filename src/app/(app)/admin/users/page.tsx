"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminOnly } from "@/components/app/admin-only";
import { adminGetUsers, adminUpdateUser, ApiError } from "@/lib/api";
import { formatIdr } from "@/lib/campaign-packages";
import type { AdminUser } from "@/lib/types";

type RoleKey = "isAdmin" | "isBrand" | "isClipper";

function UsersInner() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminGetUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(u: AdminUser, key: RoleKey, value: boolean) {
    // optimistic
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, [key]: value } : x)));
    setError(null);
    try {
      await adminUpdateUser(u.id, { [key]: value });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal update.");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, [key]: !value } : x)));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-lime" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Admin · User</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kelola peran user. Hati-hati saat mengubah akses admin.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 text-center font-medium">Brand</th>
              <th className="px-4 py-3 text-center font-medium">Clipper</th>
              <th className="px-4 py-3 text-center font-medium">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                  <Badge variant="muted" className="mt-1 capitalize">{u.primaryRole}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div>{u.creditBalance} kredit</div>
                  <div className="text-lime">{formatIdr(u.pointBalance)}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={u.isBrand} onCheckedChange={(v) => toggle(u, "isBrand", v)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={u.isClipper} onCheckedChange={(v) => toggle(u, "isClipper", v)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Switch checked={u.isAdmin} onCheckedChange={(v) => toggle(u, "isAdmin", v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminOnly>
      <UsersInner />
    </AdminOnly>
  );
}
