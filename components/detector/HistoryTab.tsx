"use client";

import type { HistoryRecord } from "@/lib/detectionHistory";
import { DetectionHistoryLog } from "@/components/detector/DetectionHistoryLog";

type HistoryTabProps = {
  history: HistoryRecord[];
  loading: boolean;
  onExport: () => void;
  onClear: () => void;
  onShare: (record: HistoryRecord) => void;
  shareBusyId: string | null;
  onFalsePositive: (record: HistoryRecord) => void;
};

export function HistoryTab({
  history,
  loading,
  onExport,
  onClear,
  onShare,
  shareBusyId,
  onFalsePositive,
}: HistoryTabProps) {
  return (
    <div className="mt-6" role="tabpanel" aria-label="History">
      <DetectionHistoryLog
        history={history}
        loading={loading}
        onExport={onExport}
        onClear={onClear}
        onShare={onShare}
        shareBusyId={shareBusyId}
        onFalsePositive={onFalsePositive}
      />
    </div>
  );
}
