"use client";

import { useEffect } from "react";
import { initMonitoring } from "@/lib/monitoring";

export function MonitoringInit() {
  useEffect(() => {
    void initMonitoring();
  }, []);

  return null;
}
