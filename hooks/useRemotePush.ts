"use client";

import { useCallback, useEffect, useState } from "react";
import {
  disableRemotePush,
  enableRemotePush,
  getRemotePushSubscription,
  isPushServerReady,
  isRemotePushConfigured,
  remotePushStatusMessage,
  resetPushServerCache,
  type RemotePushStatus,
} from "@/lib/notifications";

export function useRemotePush() {
  const [status, setStatus] = useState<RemotePushStatus>("not-subscribed");
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isRemotePushConfigured()) {
      setStatus("no-vapid");
      setServerReady(false);
      setErrorMessage(remotePushStatusMessage("no-vapid"));
      return;
    }
    resetPushServerCache();
    const ready = await isPushServerReady();
    setServerReady(ready);
    if (!ready) {
      setStatus("server-unconfigured");
      setErrorMessage(remotePushStatusMessage("server-unconfigured"));
      return;
    }
    setErrorMessage(null);
    const sub = await getRemotePushSubscription();
    setStatus(sub ? "subscribed" : "not-subscribed");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const next = await enableRemotePush();
      setStatus(next);
      if (next === "subscribed") {
        setErrorMessage(null);
      } else {
        setErrorMessage(remotePushStatusMessage(next));
      }
      if (next === "server-unconfigured") {
        setServerReady(false);
      }
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
    errorMessage,
    enable,
    disable,
    refresh,
  };
}
