interface HeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
}

const SoundIcon = ({ enabled }: { enabled: boolean }): React.JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9.5v5h3.5l4.5 3.7V5.8L7.5 9.5H4Z" />
    {enabled ? (
      <>
        <path d="M15 9a4.2 4.2 0 0 1 0 6" />
        <path d="M17.8 6.5a7.7 7.7 0 0 1 0 11" />
      </>
    ) : (
      <>
        <path d="m15.5 10 4 4" />
        <path d="m19.5 10-4 4" />
      </>
    )}
  </svg>
);

const SettingsIcon = (): React.JSX.Element => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  </svg>
);

export function Header({
  soundEnabled,
  onToggleSound,
  onOpenSettings,
}: HeaderProps): React.JSX.Element {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span className="brand-name">MonoFocus</span>
      </div>

      <div className="header-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={soundEnabled ? "Mute completion sound" : "Enable completion sound"}
          title={soundEnabled ? "Mute sound" : "Enable sound"}
          onClick={onToggleSound}
        >
          <SoundIcon enabled={soundEnabled} />
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Open settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}
