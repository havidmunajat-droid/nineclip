import Link from "next/link";
import { Film, Scissors, Upload, Youtube } from "lucide-react";
import type { Project } from "@/lib/types";
import { StatusBadge, stageLabels } from "@/components/app/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatDuration, timeAgo } from "@/lib/utils";

export function ProjectCard({ project }: { project: Project }) {
  const SourceIcon = project.sourceType === "youtube" ? Youtube : Upload;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-lime/40 hover:shadow-glow-sm"
    >
      {/* thumbnail */}
      <div
        className="relative aspect-video w-full"
        style={{
          background: `radial-gradient(120% 120% at 30% 10%, hsl(${project.hue} 60% 26%) 0%, hsl(${project.hue} 50% 12%) 50%, #0a0a0a 100%)`,
        }}
      >
        <div className="absolute right-2.5 top-2.5">
          <StatusBadge status={project.status} />
        </div>
        <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur">
          {formatDuration(project.duration)}
        </div>
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur">
          <SourceIcon className="size-3" />
          {project.sourceType === "youtube" ? "YouTube" : "Upload"}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex size-12 items-center justify-center rounded-full bg-lime text-[hsl(80_60%_6%)]">
            <Film className="size-5" />
          </div>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-medium leading-snug">{project.title}</h3>

        {project.status === "processing" ? (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-lime">{stageLabels[project.stage]}</span>
              <span className="text-muted-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
            {project.status === "ready" && (
              <span className="flex items-center gap-1">
                <Scissors className="size-3.5 text-lime" />
                {project.clipsCount} klip
              </span>
            )}
            {project.status === "failed" && (
              <span className="text-red-400">Pemrosesan gagal</span>
            )}
            <span className="ml-auto">{timeAgo(project.createdAt)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
