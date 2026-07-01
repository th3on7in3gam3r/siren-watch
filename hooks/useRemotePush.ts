"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disableRemotePush,
  enableRemotePush,
  getRemotePushSubscription,
  isPushServerReady,
  isRemotePushConfigured,
  type RemotePushStatus,
} from "@/lib/notifications";

export function useRemotePush() {
  const [status, setStatus] = useState<RemotePushStatus>("not-subscribed");
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!isRemotePushConfigured()) {
      setStatus("no-vapid");
      setServerReady(false);
      return;
    }
    const ready = await isPushServerReady();
    setServerReady(ready);
    if (!ready) {
      setStatus("server-unconfigured");
      return;
    }
    const sub = await getRemotePushSubscription();
    setStatus(sub ? "subscribed" : "not-subscribed");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setLoading(true);
    try {
      const next = await enableRemotePush();
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      await disableRemotePush();
      setStatus("not-subscribed");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    status,
    loading,
    configured: isRemotePushConfigured(),
    serverReady,
    enable,
    disable,
    refresh,
  };
}
