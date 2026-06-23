"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Crop,
  Languages,
  Loader2,
  RefreshCw,
  Upload,
  Youtube,
} from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { ClipsResult } from "@/components/app/clips-result";
import { ProcessingView } from "@/components/app/processing-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLIP_LENGTH_LABELS, type Clip, type Project } from "@/lib/types";
import { engagementCurve } from "@/lib/mock";
import { getProject, getClips, ApiError } from "@/lib/api";
import { formatDuration } from "@/lib/utils";

const POLL_INTERVAL = 3000;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchProject() {
      try {
        const proj = await getProject(id);
        if (!active) return;
        setProject(proj);

        if (proj.status === "ready") {
          const cls = await getClips(id);
          if (active) setClips(cls);
        } else if (proj.status === "processing" || proj.status === "queued") {
          pollTimer = setTimeout(fetchProject, POLL_INTERVAL);
        }
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setMissing(true);
        } else {
          router.replace("/dashboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProject();
    return () => {
      active = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-lime" />
      </div>
    );
  }

  if (missing || !project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Project tidak ditemukan.</p>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Kembali ke Dashboard</Link>
        </Button>
      </div>
    );
  }

  const curve = engagementCurve(project, 60);
  const SourceIcon = project.sourceType === "youtube" ? Youtube : Upload;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {project.title}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="muted" className="gap-1">
              <SourceIcon className="size-3" />
              {project.sourceType === "youtube" ? "YouTube" : "Upload"}
            </Badge>
            <Badge variant="muted" className="gap-1">
              <Clock className="size-3" /> {formatDuration(project.duration)}
            </Badge>
            <Badge variant="muted" className="gap-1">
              <Crop className="size-3" /> {project.settings.aspectRatio}
            </Badge>
            <Badge variant="muted" className="gap-1">
              {CLIP_LENGTH_LABELS[project.settings.clipLength]}
            </Badge>
            <Badge variant="muted" className="gap-1">
              <Languages className="size-3" /> {project.settings.language.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {project.status === "ready" && (
        <ClipsResult project={project} clips={clips} curve={curve} />
      )}

      {(project.status === "processing" || project.status === "queued") && (
        <ProcessingView project={project} clips={clips} curve={curve} />
      )}

      {project.status === "failed" && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-red-400">
            <RefreshCw className="size-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold">Pemrosesan gagal</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Terjadi kesalahan saat mengunduh video. Pastikan link valid dan video bersifat
            publik, lalu coba lagi.
          </p>
          <Button className="mt-5">
            <RefreshCw className="size-4" /> Coba lagi
          </Button>
        </div>
      )}
    </div>
  );
}
