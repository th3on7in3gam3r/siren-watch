"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDetection,
  clearDetections,
  downloadCsv,
  getRecentDetections,
  markFalsePositive,
  type HistoryRecord,
} from "@/lib/detectionHistory";

export function useDetectionHistory() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getRecentDetections(50);
      setHistory(records);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logDetection = useCallback(
    async (record: Omit<HistoryRecord, "id" | "timestamp">) => {
      const entry = await addDetection(record);
      setHistory((prev) => [entry, ...prev].slice(0, 50));
      return entry;
    },
    []
  );

  const clearHistory = useCallback(async () => {
    await clearDetections();
    setHistory([]);
  }, []);

  const exportCsv = useCallback(() => {
    downloadCsv(history);
  }, [history]);

  const reportFalsePositive = useCallback(async (id: string) => {
    await markFalsePositive(id);
    setHistory((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, feedback: "false_positive" as const } : r
      )
    );
  }, []);

  return {
    history,
    loading,
    refresh,
    logDetection,
    clearHistory,
    exportCsv,
    reportFalsePositive,
  };
}
