export type AppTab = "listen" | "settings" | "history";

type TabBarProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  historyCount?: number;
};

const TABS: { id: AppTab; label: string }[] = [
  { id: "listen", label: "Listen" },
  { id: "settings", label: "Settings" },
  { id: "history", label: "History" },
];

export function TabBar({ active, onChange, historyCount = 0 }: TabBarProps) {
  return (
    <nav
      className="mt-4 grid grid-cols-3 gap-1 rounded-sm border border-line bg-panel/60 p-1"
      role="tablist"
      aria-label="Main sections"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative rounded-[2px] py-2.5 text-[11px] font-semibold uppercase tracking-widest transition ${
              isActive
                ? "bg-signal/15 text-signal"
                : "text-fog hover:text-paper"
            }`}
          >
            {tab.label}
            {tab.id === "history" && historyCount > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[9px] ${
                  isActive ? "bg-signal/25 text-signal" : "bg-line text-fog"
                }`}
              >
                {historyCount > 99 ? "99+" : historyCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
