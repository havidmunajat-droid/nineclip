"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Film, Flame, Loader2, Plus, Scissors } from "lucide-react";
import { ProjectCard } from "@/components/app/project-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getClips, getProjects } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getProjects();
        if (!active) return;
        setProjects(list);

        // Rata-rata skor viral dari klip pada project yang sudah selesai
        const ready = list.filter((p) => p.status === "ready");
        const clipBatches = await Promise.all(
          ready.map((p) => getClips(p.id).catch(() => [])),
        );
        if (!active) return;
        const allClips = clipBatches.flat();
        setAvgScore(
          allClips.length
            ? Math.round(
                allClips.reduce((n, c) => n + c.viralityScore, 0) /
                  allClips.length,
              )
            : 0,
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalClips = projects.reduce((n, p) => n + p.clipsCount, 0);

  const stats = [
    { label: "Total project", value: projects.length, icon: Film },
    { label: "Klip dihasilkan", value: totalClips, icon: Scissors },
    {
      label: "Menit terpakai",
      value: `${user?.minutesUsed ?? 0}/${user?.minutesQuota ?? 0}`,
      icon: Clock,
    },
    { label: "Rata-rata skor viral", value: avgScore, icon: Flame },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Halo, {user?.name.split(" ")[0] ?? ""} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ubah video panjangmu jadi klip pendek yang siap viral.
          </p>
        </div>
        <Button asChild>
          <Link href="/new">
            <Plus className="size-4" /> Project baru
          </Link>
        </Button>
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className="size-4 text-lime" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* projects */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Project terbaru</h2>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-lime" />
        </div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}

          {/* new-project tile */}
          <Link
            href="/new"
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-lime/50 hover:bg-card"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime">
              <Plus className="size-6" />
            </div>
            <div>
              <div className="font-medium">Buat project baru</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Tempel link YouTube atau upload video
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
