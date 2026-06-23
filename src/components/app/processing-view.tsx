"use client";

import { Check, Loader2 } from "lucide-react";
import type { Clip, EngagementPoint, Project } from "@/lib/types";
import type { ProcessingStage } from "@/lib/types";
import { stageLabels } from "@/components/app/status-badge";
import { ClipsResult } from "@/components/app/clips-result";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const order: ProcessingStage[] = [
  "download",
  "transcribe",
  "analyze",
  "clip",
  "reframe",
  "caption",
  "done",
];

export function ProcessingView({
  project,
  clips,
  curve,
}: {
  project: Project;
  clips: Clip[];
  curve: EngagementPoint[];
}) {
  if (project.status === "ready") {
    return <ClipsResult project={project} clips={clips} curve={curve} />;
  }

  const progress = Math.max(project.progress, project.status === "queued" ? 2 : 8);
  const currentStage = project.stage ?? "download";
  const currentIndex = order.indexOf(currentStage as ProcessingStage);
  const safeIndex = currentIndex < 0 ? 0 : Math.min(currentIndex, order.length - 2);

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-lime" />
          <div>
            <div className="font-display font-semibold">
              {project.status === "queued" ? "Menunggu antrian…" : "Memproses video…"}
            </div>
            <div className="text-sm text-muted-foreground">
              {stageLabels[currentStage as ProcessingStage] ?? "Menyiapkan…"}
            </div>
          </div>
          <div className="ml-auto font-display text-2xl font-bold text-lime">
            {Math.round(progress)}%
          </div>
        </div>

        <Progress value={progress} className="mt-5 h-2.5" />

        <ol className="mt-6 grid gap-2 sm:grid-cols-2">
          {order.slice(0, -1).map((stage, i) => {
            const state = i < safeIndex ? "done" : i === safeIndex ? "active" : "todo";
            return (
              <li
                key={stage}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                  state === "active"
                    ? "border-lime/40 bg-lime/10 text-foreground"
                    : "border-border bg-secondary/30"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    state === "done" ? "bg-lime" : state === "active" ? "bg-lime/30" : "bg-white/10"
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3 text-[hsl(80_60%_6%)]" />
                  ) : state === "active" ? (
                    <Loader2 className="size-3 animate-spin text-lime" />
                  ) : null}
                </span>
                <span className={state === "todo" ? "text-muted-foreground" : ""}>
                  {stageLabels[stage]}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Kamu bisa menutup halaman ini — kami akan memberi tahu saat klip siap.
        </p>
      </div>
    </div>
  );
}
