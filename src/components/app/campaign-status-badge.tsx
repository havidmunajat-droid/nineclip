import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/lib/types";
import { CheckCircle2, Clock, FileText, Loader2, Rocket, XCircle } from "lucide-react";

const map: Record<
  CampaignStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "muted"; icon: React.ElementType }
> = {
  draft: { label: "Draft", variant: "muted", icon: FileText },
  processing: { label: "Memproses", variant: "warning", icon: Loader2 },
  ready_review: { label: "Menunggu review", variant: "warning", icon: Clock },
  active: { label: "Aktif", variant: "success", icon: Rocket },
  completed: { label: "Selesai", variant: "success", icon: CheckCircle2 },
  expired: { label: "Berakhir", variant: "muted", icon: XCircle },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const s = map[status] ?? map.draft;
  const Icon = s.icon;
  return (
    <Badge variant={s.variant} className="gap-1.5">
      <Icon className={status === "processing" ? "size-3 animate-spin" : "size-3"} />
      {s.label}
    </Badge>
  );
}
