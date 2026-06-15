export type AppView = "timer" | "block" | "tasks" | "report" | "settings";

interface BottomNavProps {
  activeView: AppView;
  onSelect: (view: AppView) => void;
}

const NAV_ITEMS: Array<{
  id: Exclude<AppView, "settings">;
  label: string;
  icon: React.JSX.Element;
}> = [
  {
    id: "timer",
    label: "Timer",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7.5" />
        <path d="M9.5 2.8h5M12 5.5V3M17.6 7.4l1.5-1.5M12 9v4.4l2.8 1.7" />
      </svg>
    ),
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4 7 1.7 1.7L9 5.4M11.5 7h8M4 13l1.7 1.7L9 11.4M11.5 13h8M4 19l1.7 1.7L9 17.4M11.5 19h8" />
      </svg>
    ),
  },
  {
    id: "block",
    label: "Block",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.25" />
        <path d="M6.15 17.85 17.85 6.15" />
      </svg>
    ),
  },
  {
    id: "report",
    label: "Report",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 20V10M12 20V4M19 20v-7" />
        <path d="M3 20h18" />
      </svg>
    ),
  },
];

export function BottomNav({
  activeView,
  onSelect,
}: BottomNavProps): React.JSX.Element {
  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === activeView);

  return (
    <nav
      className={
        activeView === "settings"
          ? "bottom-navigation is-settings-active"
          : "bottom-navigation"
      }
      aria-label="Main navigation"
      style={
        {
          "--active-index": Math.max(activeIndex, 0),
        } as React.CSSProperties
      }
    >
      <div className="bottom-nav">
        <span className="nav-active-highlight" aria-hidden="true" />

        {NAV_ITEMS.map((item) => (
          <button
            className={item.id === activeView ? "nav-item is-active" : "nav-item"}
            type="button"
            key={item.id}
            aria-label={item.label}
            title={item.label}
            aria-current={item.id === activeView ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <button
        className="settings-nav-button"
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-current={activeView === "settings" ? "page" : undefined}
        onClick={() => onSelect("settings")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      </button>
    </nav>
  );
}
