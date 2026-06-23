import { Badge } from "@/components/ui/badge";
import type { ProcessingStage, ProjectStatus } from "@/lib/types";
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

const statusMap: Record<
  ProjectStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "muted"; icon: React.ElementType }
> = {
  queued: { label: "Antri", variant: "muted", icon: Clock },
  processing: { label: "Memproses", variant: "warning", icon: Loader2 },
  ready: { label: "Selesai", variant: "success", icon: CheckCircle2 },
  failed: { label: "Gagal", variant: "danger", icon: XCircle },
};

export const stageLabels: Record<ProcessingStage, string> = {
  download: "Mengunduh video",
  transcribe: "Transkrip audio",
  analyze: "Menganalisis engagement",
  clip: "Memotong klip",
  reframe: "Reframe 9:16",
  caption: "Menambah caption",
  done: "Selesai",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = statusMap[status];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant} className="gap-1.5">
      <Icon className={status === "processing" ? "size-3 animate-spin" : "size-3"} />
      {s.label}
    </Badge>
  );
}
