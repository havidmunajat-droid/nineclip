"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { plans, formatIDR } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div>
      {/* billing toggle */}
      <div className="mb-10 flex items-center justify-center gap-4">
        <span className={cn("text-sm font-medium", !yearly ? "text-foreground" : "text-muted-foreground")}>
          Bulanan
        </span>
        <button
          role="switch"
          aria-checked={yearly}
          onClick={() => setYearly((v) => !v)}
          className={cn(
            "relative h-7 w-14 rounded-full border border-border transition-colors",
            yearly ? "bg-primary" : "bg-secondary"
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-5 w-5 rounded-full bg-background shadow transition-transform",
              yearly ? "translate-x-8" : "translate-x-1"
            )}
          />
        </button>
        <span className={cn("text-sm font-medium", yearly ? "text-foreground" : "text-muted-foreground")}>
          Tahunan
        </span>
        <Badge variant="success" className="hidden sm:inline-flex">
          Hemat 2 bulan
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-card p-7 transition-all",
                plan.highlighted
                  ? "border-lime/50 shadow-glow"
                  : "border-border hover:border-white/20"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1 border border-lime/40 bg-lime/20 px-3 py-1">
                    <Sparkles className="size-3" /> Paling populer
                  </Badge>
                </div>
              )}
              <h3 className="font-display text-xl font-bold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-6 flex items-end gap-1">
                <span className="font-display text-4xl font-extrabold tracking-tight">
                  {price === 0 ? "Gratis" : formatIDR(price)}
                </span>
                {price > 0 && (
                  <span className="mb-1 text-sm text-muted-foreground">
                    /{yearly ? "thn" : "bln"}
                  </span>
                )}
              </div>

              <Button
                asChild
                variant={plan.highlighted ? "default" : "secondary"}
                className="mt-6 w-full"
              >
                <Link href="/register">
                  {plan.id === "free" ? "Mulai gratis" : `Pilih ${plan.name}`}
                </Link>
              </Button>

              <ul className="mt-7 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-lime" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
