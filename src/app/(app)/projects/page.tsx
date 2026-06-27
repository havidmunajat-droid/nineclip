"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Loader2, Plus, Scissors } from "lucide-react";
import { ProjectCard } from "@/components/app/project-card";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/api";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getProjects()
      .then((list) => active && setProjects(list))
      .catch(() => active && setProjects([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const done = projects.filter((p) => p.status === "ready");
  const processing = projects.filter((p) => p.status === "processing");
  const totalClips = projects.reduce((n, p) => n + p.clipsCount, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Proyek</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semua video yang pernah kamu proses.
          </p>
        </div>
        <Button asChild>
          <Link href="/new">
            <Plus className="size-4" /> Project baru
          </Link>
        </Button>
      </div>

      {/* mini stats */}
      {!loading && projects.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
            <Film className="size-4 text-lime" />
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{projects.length}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
            <Scissors className="size-4 text-lime" />
            <span className="text-muted-foreground">Klip dihasilkan</span>
            <span className="font-semibold">{totalClips}</span>
          </div>
          {processing.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
              <Loader2 className="size-4 animate-spin" />
              {processing.length} sedang diproses
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Selesai</span>
            <span className="font-semibold">{done.length}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="size-6 animate-spin text-lime" />
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-lime/15 text-lime">
            <Film className="size-7" />
          </div>
          <h2 className="mt-4 font-display font-semibold">Belum ada proyek</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tempel link YouTube atau upload video untuk mulai membuat klip pendek.
          </p>
          <Button asChild className="mt-6">
            <Link href="/new">
              <Plus className="size-4" /> Buat project pertama
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <Link
            href="/new"
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center transition-colors hover:border-lime/50 hover:bg-card"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime">
              <Plus className="size-6" />
            </div>
            <div>
              <div className="font-medium">Project baru</div>
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
