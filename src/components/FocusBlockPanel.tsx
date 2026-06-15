import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  BlockedApp,
  BlockedWebsite,
  BlockingSettings,
  TimerState,
} from "@/types";

interface FocusBlockPanelProps {
  settings: BlockingSettings;
  timer: TimerState;
  onChange: (settings: BlockingSettings) => void;
  onOpenWindowsSettings: () => Promise<boolean>;
}

type StatusTone = "success" | "error" | "info";
type BlockingSection = "websites" | "apps" | "notifications";

interface StatusMessage {
  text: string;
  tone: StatusTone;
}

interface InstalledApplication {
  name: string;
  exePath?: string;
}

const normalizeWebsite = (value: string): string =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const Toggle = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element => (
  <button
    className="blocking-toggle"
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    onClick={() => onChange(!checked)}
  >
    <span aria-hidden="true">
      <span />
    </span>
  </button>
);

export function FocusBlockPanel({
  settings,
  timer,
  onChange,
  onOpenWindowsSettings,
}: FocusBlockPanelProps): React.JSX.Element {
  const [websiteInput, setWebsiteInput] = useState("");
  const [websiteCategory, setWebsiteCategory] = useState("Custom");
  const [installedApps, setInstalledApps] = useState<InstalledApplication[]>([]);
  const [appSearch, setAppSearch] = useState("");
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [activeSection, setActiveSection] =
    useState<BlockingSection>("websites");
  const [platform, setPlatform] = useState<"loading" | "win32" | "other" | "web">(
    "loading",
  );
  const blockingActive = timer.mode === "focus" && timer.status === "running";

  const loadInstalledApps = async (): Promise<void> => {
    if (!window.monoFocus) {
      return;
    }

    setIsLoadingApps(true);
    try {
      const applications = await window.monoFocus.getInstalledApplications();
      setInstalledApps(applications);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (!window.monoFocus) {
      setPlatform("web");
      return;
    }

    void window.monoFocus.getPlatform().then((value) => {
      if (mounted) {
        setPlatform(value === "win32" ? "win32" : "other");
        if (value === "win32") {
          void loadInstalledApps();
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredInstalledApps = useMemo(() => {
    const query = appSearch.trim().toLowerCase();
    const filtered = query
      ? installedApps.filter(
          (application) =>
            application.name.toLowerCase().includes(query) ||
            application.exePath?.toLowerCase().includes(query),
        )
      : installedApps;

    return filtered.slice(0, 80);
  }, [appSearch, installedApps]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const timeout = window.setTimeout(() => setStatus(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const updateWebsites = (websites: BlockedWebsite[]): void => {
    onChange({ ...settings, websites });
  };

  const updateApps = (apps: BlockedApp[]): void => {
    onChange({ ...settings, apps });
  };

  const updateNotifications = (
    notifications: Partial<BlockingSettings["notifications"]>,
  ): void => {
    onChange({
      ...settings,
      notifications: {
        ...settings.notifications,
        ...notifications,
      },
    });
  };

  const addWebsite = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const pattern = normalizeWebsite(websiteInput);

    if (!pattern) {
      setStatus({ text: "Enter a website or URL", tone: "error" });
      return;
    }

    if (settings.websites.some((website) => website.pattern === pattern)) {
      setStatus({ text: "Already in blocklist", tone: "error" });
      return;
    }

    updateWebsites([
      ...settings.websites,
      {
        id: crypto.randomUUID(),
        pattern,
        category: websiteCategory,
        enabled: true,
      },
    ]);
    setWebsiteInput("");
    setStatus({ text: "Website added", tone: "success" });
  };

  const addApp = (application: InstalledApplication): void => {
    const identity = (application.exePath ?? application.name).toLowerCase();
    if (
      settings.apps.some(
        (app) => (app.exePath ?? app.name).toLowerCase() === identity,
      )
    ) {
      setStatus({ text: "Already in blocklist", tone: "error" });
      return;
    }

    updateApps([
      ...settings.apps,
      {
        id: crypto.randomUUID(),
        name: application.name,
        exePath: application.exePath,
        enabled: true,
      },
    ]);
    setStatus({ text: "App added", tone: "success" });
  };

  const openNotificationSettings = async (): Promise<void> => {
    const opened = await onOpenWindowsSettings();
    setStatus({
      text: opened
        ? "Windows notification settings opened"
        : "Windows notification settings are unavailable here",
      tone: opened ? "success" : "info",
    });
  };

  return (
    <section className="panel blocking-page" aria-labelledby="blocking-title">
      <header className="blocking-header">
        <div>
          <span className="eyebrow">Distraction control</span>
          <h2 id="blocking-title">Blocking</h2>
          <p>
            Choose the apps, websites, and notifications you want to block
            during focus sessions.
          </p>
        </div>
        <span
          className={
            blockingActive
              ? "blocking-status is-active"
              : "blocking-status"
          }
        >
          <span aria-hidden="true" />
          {blockingActive ? "Blocking active" : "Blocking inactive"}
        </span>
      </header>

      {status ? (
        <div className={`blocking-toast is-${status.tone}`} role="status">
          {status.text}
        </div>
      ) : null}

      <nav
        className={`blocking-section-nav is-${activeSection}`}
        aria-label="Blocking sections"
      >
        <span className="blocking-section-indicator" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={activeSection === "websites"}
          onClick={() => setActiveSection("websites")}
        >
          Websites
        </button>
        <button
          type="button"
          aria-pressed={activeSection === "apps"}
          onClick={() => setActiveSection("apps")}
        >
          Apps
        </button>
        <button
          type="button"
          aria-pressed={activeSection === "notifications"}
          onClick={() => setActiveSection("notifications")}
        >
          Notifications
        </button>
      </nav>

      <div className="blocking-content">
        {activeSection === "websites" ? (
        <article className="blocking-card blocking-section-page">
          <div className="blocking-card-heading">
            <div>
              <h3>Website Blocking</h3>
              <p>Keep distracting domains and specific pages out of reach.</p>
            </div>
            <span>{settings.websites.length}</span>
          </div>

          <div className="blocking-list">
            {settings.websites.length === 0 ? (
              <div className="blocking-empty">No blocked websites yet.</div>
            ) : (
              settings.websites.map((website) => (
                <div className="blocking-row" key={website.id}>
                  <div className="blocking-row-copy">
                    <strong>{website.pattern}</strong>
                    {website.category ? <small>{website.category}</small> : null}
                  </div>
                  <Toggle
                    checked={website.enabled}
                    label={`${website.enabled ? "Disable" : "Enable"} ${website.pattern}`}
                    onChange={(enabled) =>
                      updateWebsites(
                        settings.websites.map((item) =>
                          item.id === website.id ? { ...item, enabled } : item,
                        ),
                      )
                    }
                  />
                  <button
                    className="blocking-remove"
                    type="button"
                    aria-label={`Remove ${website.pattern}`}
                    onClick={() => {
                      updateWebsites(
                        settings.websites.filter((item) => item.id !== website.id),
                      );
                      setStatus({ text: "Website removed", tone: "success" });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <form className="blocking-add-form" onSubmit={addWebsite}>
            <input
              type="text"
              value={websiteInput}
              placeholder="Add website or URL, e.g. youtube.com or youtube.com/shorts"
              aria-label="Website or URL"
              onChange={(event) => setWebsiteInput(event.target.value)}
            />
            <select
              value={websiteCategory}
              aria-label="Website category"
              onChange={(event) => setWebsiteCategory(event.target.value)}
            >
              <option>Custom</option>
              <option>Social</option>
              <option>Video</option>
              <option>Gaming</option>
            </select>
            <button className="button button-primary" type="submit">
              Add Website
            </button>
          </form>
          <p className="blocking-helper">
            Specific URLs work best with the browser extension. Domain blocking
            applies to the whole site.
          </p>
        </article>
        ) : null}

        {activeSection === "apps" ? (
        <article className="blocking-card blocking-section-page">
          <div className="blocking-card-heading">
            <div>
              <h3>App Blocking</h3>
              <p>List desktop apps you want closed during deep work.</p>
            </div>
            <span>{settings.apps.length}</span>
          </div>

          <div className="blocking-list">
            {settings.apps.length === 0 ? (
              <div className="blocking-empty">No blocked apps yet.</div>
            ) : (
              settings.apps.map((app) => (
                <div className="blocking-row" key={app.id}>
                  <div className="blocking-row-copy">
                    <strong>{app.name}</strong>
                    {app.exePath ? <small>{app.exePath}</small> : null}
                  </div>
                  <Toggle
                    checked={app.enabled}
                    label={`${app.enabled ? "Disable" : "Enable"} ${app.name}`}
                    onChange={(enabled) =>
                      updateApps(
                        settings.apps.map((item) =>
                          item.id === app.id ? { ...item, enabled } : item,
                        ),
                      )
                    }
                  />
                  <button
                    className="blocking-remove"
                    type="button"
                    aria-label={`Remove ${app.name}`}
                    onClick={() => {
                      updateApps(
                        settings.apps.filter((item) => item.id !== app.id),
                      );
                      setStatus({ text: "App removed", tone: "success" });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="installed-app-picker">
            <div className="installed-app-toolbar">
              <input
                type="search"
                value={appSearch}
                placeholder="Search applications on this PC"
                aria-label="Search installed applications"
                disabled={platform !== "win32"}
                onChange={(event) => setAppSearch(event.target.value)}
              />
              <button
                className="button button-secondary"
                type="button"
                disabled={platform !== "win32" || isLoadingApps}
                onClick={() => void loadInstalledApps()}
              >
                {isLoadingApps ? "Scanning..." : "Refresh"}
              </button>
            </div>

            <div className="installed-app-list" aria-label="Installed applications">
              {platform === "web" ? (
                <div className="blocking-empty">
                  Installed applications are available in the desktop app.
                </div>
              ) : platform === "other" ? (
                <div className="blocking-empty">
                  Application discovery is currently available only on Windows.
                </div>
              ) : platform === "loading" ? (
                <div className="blocking-empty">Checking this device...</div>
              ) : isLoadingApps ? (
                <div className="blocking-empty">Scanning installed applications...</div>
              ) : filteredInstalledApps.length === 0 ? (
                <div className="blocking-empty">
                  {appSearch
                    ? "No applications match your search."
                    : "No installed applications were found."}
                </div>
              ) : (
                filteredInstalledApps.map((application) => {
                  const identity = (
                    application.exePath ?? application.name
                  ).toLowerCase();
                  const isAdded = settings.apps.some(
                    (app) =>
                      (app.exePath ?? app.name).toLowerCase() === identity,
                  );

                  return (
                    <div
                      className="installed-app-row"
                      key={`${application.name}|${application.exePath ?? ""}`}
                    >
                      <div className="blocking-row-copy">
                        <strong>{application.name}</strong>
                        {application.exePath ? (
                          <small>{application.exePath}</small>
                        ) : null}
                      </div>
                      <button
                        className={
                          isAdded
                            ? "installed-app-add is-added"
                            : "installed-app-add"
                        }
                        type="button"
                        disabled={isAdded}
                        aria-label={`${isAdded ? "Added" : "Add"} ${application.name}`}
                        onClick={() => addApp(application)}
                      >
                        {isAdded ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <p className="blocking-helper">
            Choose an installed application above. During focus mode, supported
            blocked apps will be closed automatically if opened.
          </p>
        </article>
        ) : null}

        {activeSection === "notifications" ? (
        <article className="blocking-card notification-card blocking-section-page">
          <div className="blocking-card-heading">
            <div>
              <h3>System Notifications</h3>
              <p>
                When enabled, MonoFocus will try to reduce Windows notifications
                while your focus timer is running.
              </p>
            </div>
          </div>

          <div className="notification-options">
            <div className="notification-option is-primary">
              <div>
                <strong>Silence system notifications during focus sessions</strong>
                <small>Always visible and controlled by you.</small>
              </div>
              <Toggle
                checked={settings.notifications.silenceDuringFocus}
                label="Silence system notifications during focus sessions"
                onChange={(silenceDuringFocus) => {
                  updateNotifications({ silenceDuringFocus });
                  setStatus({
                    text: silenceDuringFocus
                      ? "Notification blocking enabled"
                      : "Notification blocking disabled",
                    tone: "success",
                  });
                }}
              />
            </div>
            <div className="notification-option">
              <div>
                <strong>Use Windows Focus / Do Not Disturb when available</strong>
              </div>
              <Toggle
                checked={settings.notifications.useWindowsFocus}
                label="Use Windows Focus or Do Not Disturb when available"
                onChange={(useWindowsFocus) =>
                  updateNotifications({ useWindowsFocus })
                }
              />
            </div>
            <div className="notification-option">
              <div>
                <strong>Restore notification mode when session ends</strong>
              </div>
              <Toggle
                checked={settings.notifications.restoreAfterSession}
                label="Restore notification mode when session ends"
                onChange={(restoreAfterSession) =>
                  updateNotifications({ restoreAfterSession })
                }
              />
            </div>
          </div>

          <div className="notification-footer">
            <p>
              {platform === "other"
                ? "System notification blocking is currently available only on Windows."
                : platform === "web"
                  ? "System-wide notification control requires a desktop app build."
                  : "On Windows 11, this uses Focus / Do Not Disturb where supported. If direct control is unavailable, open Windows settings to enable it manually."}
            </p>
            <button
              className="button button-secondary"
              type="button"
              disabled={platform !== "win32"}
              onClick={() => void openNotificationSettings()}
            >
              Open Windows notification settings
            </button>
          </div>
        </article>
        ) : null}

        {activeSection === "websites" ? (
        <aside className="blocking-info">
          <span aria-hidden="true">i</span>
          <p>
            Website blocking works best with the browser extension installed.
            System-level domain blocking may require administrator permission.
          </p>
        </aside>
        ) : null}
      </div>
    </section>
  );
}
