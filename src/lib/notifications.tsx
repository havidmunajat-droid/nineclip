"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth";
import { getClipperCampaigns } from "./api";

interface NotificationsCtx {
  inviteCount: number;
}

const Ctx = createContext<NotificationsCtx>({ inviteCount: 0 });

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [inviteCount, setInviteCount] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.isClipper) {
      setInviteCount(0);
      return;
    }

    async function poll() {
      try {
        const items = await getClipperCampaigns();
        setInviteCount(items.filter((i) => i.status === "invited").length);
      } catch {
        // silently ignore
      }
    }

    poll();
    interval.current = setInterval(poll, 60_000);
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [user?.isClipper]);

  return <Ctx.Provider value={{ inviteCount }}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  return useContext(Ctx);
}
