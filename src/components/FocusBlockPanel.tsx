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
type BlockingSection = "websites" | "apps" | "permanent" | "notifications";
type PermanentPanel = "websites" | "apps" | null;

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
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element => (
  <button
    className="blocking-toggle"
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
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
  const [permanentWebsiteInput, setPermanentWebsiteInput] = useState("");
  const [installedApps, setInstalledApps] = useState<InstalledApplication[]>([]);
  const [appSearch, setAppSearch] = useState("");
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isRequestingAppPermission, setIsRequestingAppPermission] =
    useState(false);
  const [
    isRequestingNotificationPermission,
    setIsRequestingNotificationPermission,
  ] = useState(false);
  const [isExportingExtension, setIsExportingExtension] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [activeSection, setActiveSection] =
    useState<BlockingSection>("websites");
  const [permanentPanel, setPermanentPanel] = useState<PermanentPanel>(null);
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

  useEffect(() => {
    if (!window.monoFocus) {
      return;
    }

    let mounted = true;
    const checkConnection = async (): Promise<void> => {
      const result = await window.monoFocus?.getBrowserExtensionStatus();
      if (mounted) {
        setExtensionConnected(Boolean(result?.connected));
      }
    };

    void checkConnection();
    const interval = window.setInterval(() => void checkConnection(), 3000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const updateWebsites = (websites: BlockedWebsite[]): void => {
    onChange({ ...settings, websites });
  };

  const updateApps = (apps: BlockedApp[]): void => {
    onChange({ ...settings, apps });
  };

  const updatePermanentWebsites = (permanentWebsites: BlockedWebsite[]): void => {
    onChange({ ...settings, permanentWebsites });
  };

  const updatePermanentApps = (permanentApps: BlockedApp[]): void => {
    onChange({ ...settings, permanentApps });
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
        category: "Custom",
        enabled: true,
      },
    ]);
    setWebsiteInput("");
    setStatus({ text: "Website added", tone: "success" });
  };

  const addPermanentWebsite = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const pattern = normalizeWebsite(permanentWebsiteInput);

    if (!pattern) {
      setStatus({ text: "Enter a website or URL", tone: "error" });
      return;
    }

    if (
      settings.permanentWebsites.some(
        (website) => website.pattern === pattern,
      )
    ) {
      setStatus({ text: "Already permanently blocked", tone: "error" });
      return;
    }

    updatePermanentWebsites([
      ...settings.permanentWebsites,
      {
        id: crypto.randomUUID(),
        pattern,
        category: "Permanent",
        enabled: true,
      },
    ]);
    setPermanentWebsiteInput("");
    setStatus({ text: "Permanent website block added", tone: "success" });
  };

  const addApp = async (application: InstalledApplication): Promise<void> => {
    const identity = (application.exePath ?? application.name).toLowerCase();
    if (
      settings.apps.some(
        (app) => (app.exePath ?? app.name).toLowerCase() === identity,
      )
    ) {
      setStatus({ text: "Already in blocklist", tone: "error" });
      return;
    }

    if (!window.monoFocus) {
      setStatus({
        text: "App blocking permission requires the MonoFocus desktop app",
        tone: "info",
      });
      return;
    }

    setIsRequestingAppPermission(true);
    try {
      const permission = await window.monoFocus.requestAppBlockingPermission();
      if (!permission.granted) {
        setStatus({
          text: permission.error ?? "App blocking permission was not granted",
          tone: "error",
        });
        return;
      }
    } finally {
      setIsRequestingAppPermission(false);
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

  const addPermanentApp = async (
    application: InstalledApplication,
  ): Promise<void> => {
    const identity = (application.exePath ?? application.name).toLowerCase();
    if (
      settings.permanentApps.some(
        (app) => (app.exePath ?? app.name).toLowerCase() === identity,
      )
    ) {
      setStatus({ text: "Already permanently blocked", tone: "error" });
      return;
    }

    if (!window.monoFocus) {
      setStatus({
        text: "App blocking permission requires the MonoFocus desktop app",
        tone: "info",
      });
      return;
    }

    setIsRequestingAppPermission(true);
    try {
      const permission = await window.monoFocus.requestAppBlockingPermission();
      if (!permission.granted) {
        setStatus({
          text: permission.error ?? "App blocking permission was not granted",
          tone: "error",
        });
        return;
      }
    } finally {
      setIsRequestingAppPermission(false);
    }

    updatePermanentApps([
      ...settings.permanentApps,
      {
        id: crypto.randomUUID(),
        name: application.name,
        exePath: application.exePath,
        enabled: true,
      },
    ]);
    setStatus({ text: "Permanent app block added", tone: "success" });
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

  const requestNotificationControl = async (): Promise<boolean> => {
    if (!window.monoFocus) {
      setStatus({
        text: "Notification control requires the MonoFocus desktop app",
        tone: "info",
      });
      return false;
    }

    setIsRequestingNotificationPermission(true);
    try {
      const permission =
        await window.monoFocus.requestNotificationControlPermission();
      if (!permission.granted) {
        setStatus({
          text:
            permission.error ??
            "Windows notification control permission was not granted",
          tone: "error",
        });
        return false;
      }

      setStatus({
        text: "Windows notification control enabled",
        tone: "success",
      });
      return true;
    } finally {
      setIsRequestingNotificationPermission(false);
    }
  };

  const updateSilenceNotifications = async (
    silenceDuringFocus: boolean,
  ): Promise<void> => {
    if (silenceDuringFocus && !(await requestNotificationControl())) {
      return;
    }

    updateNotifications({ silenceDuringFocus });
    setStatus({
      text: silenceDuringFocus
        ? "Notification blocking enabled"
        : "Notification blocking disabled",
      tone: "success",
    });
  };

  const updateWindowsFocusUsage = async (
    useWindowsFocus: boolean,
  ): Promise<void> => {
    if (useWindowsFocus && !(await requestNotificationControl())) {
      return;
    }

    updateNotifications({ useWindowsFocus });
    setStatus({
      text: useWindowsFocus
        ? "Windows Focus / Do Not Disturb control enabled"
        : "Windows Focus / Do Not Disturb control disabled",
      tone: "success",
    });
  };

  const exportBrowserExtension = async (): Promise<void> => {
    if (!window.monoFocus) {
      setStatus({
        text: "Extension download requires the MonoFocus desktop app",
        tone: "info",
      });
      return;
    }

    setIsExportingExtension(true);
    try {
      const result = await window.monoFocus.exportBrowserExtension();
      if (result.cancelled) {
        return;
      }

      setStatus({
        text: result.success
          ? "Extension downloaded. Extract it and load the folder in Chromium."
          : result.error ?? "Extension download failed",
        tone: result.success ? "success" : "error",
      });
    } finally {
      setIsExportingExtension(false);
    }
  };

  return (
    <section className="panel blocking-page" aria-labelledby="blocking-title">
      <header className="blocking-header">
        <div>
          <span className="eyebrow">Distraction control</span>
          <h2 id="blocking-title">Blocking</h2>
          <p>
            Choose the apps, websites, and notifications you want to block
            during focus sessions or permanently.
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
          aria-pressed={activeSection === "permanent"}
          onClick={() => setActiveSection("permanent")}
        >
          Permanent
        </button>
        <button
          type="button"
          aria-pressed={activeSection === "notifications"}
          onClick={() => setActiveSection("notifications")}
        >
          Notifications
        </button>
      </nav>

      <div className={`blocking-content is-${activeSection}`}>
        {activeSection === "websites" ? (
        <article className="blocking-card blocking-section-page">
          <div className="blocking-card-heading">
            <div>
              <h3>Website Blocking</h3>
              <p>Keep distracting domains and specific pages out of reach.</p>
            </div>
            <span>{settings.websites.length}</span>
          </div>

          <section
            className="browser-extension-card"
            aria-labelledby="browser-extension-title"
          >
            <div className="browser-extension-summary">
              <span className="browser-extension-mark" aria-hidden="true">
                <span />
              </span>
              <div>
                <div className="browser-extension-title-row">
                  <strong id="browser-extension-title">
                    MonoFocus Website Blocker
                  </strong>
                  <span
                    className={
                      extensionConnected
                        ? "browser-extension-status is-connected"
                        : "browser-extension-status"
                    }
                  >
                    {extensionConnected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <p>
                  Syncs this blocklist to Chrome, Edge, Brave, and other
                  Chromium browsers while focus is active.
                </p>
              </div>
            </div>

            <div className="browser-extension-install">
              <ol>
                <li>Download and extract the ZIP.</li>
                <li>Open chrome://extensions or edge://extensions.</li>
                <li>Enable Developer mode, then choose Load unpacked.</li>
              </ol>
              <button
                className="button button-primary"
                type="button"
                disabled={isExportingExtension || platform !== "win32"}
                onClick={() => void exportBrowserExtension()}
              >
                {isExportingExtension
                  ? "Preparing..."
                  : "Download"}
              </button>
            </div>
          </section>

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
            <button
              className="button button-primary blocking-symbol-button"
              type="submit"
              aria-label="Add website"
            >
              +
            </button>
          </form>
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
                        disabled={isAdded || isRequestingAppPermission}
                        aria-label={`${isAdded ? "Added" : "Add"} ${application.name}`}
                        onClick={() => void addApp(application)}
                      >
                        {isAdded
                          ? "Added"
                          : isRequestingAppPermission
                            ? "Allowing..."
                            : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </article>
        ) : null}

        {activeSection === "permanent" ? (
        <article className="blocking-card blocking-section-page permanent-blocking-page">
          <div className="blocking-card-heading">
            <div>
              <h3>Permanent Blocking</h3>
              <p>
                Keep selected websites and desktop apps blocked even when the
                focus timer is not running.
              </p>
            </div>
            <span>
              {settings.permanentWebsites.length +
                settings.permanentApps.length}
            </span>
          </div>

          <div className="permanent-blocking-grid">
            <section
              className={
                permanentPanel === "websites"
                  ? "permanent-blocking-section is-open"
                  : "permanent-blocking-section"
              }
            >
              <button
                className="permanent-blocking-section-heading"
                type="button"
                aria-expanded={permanentPanel === "websites"}
                onClick={() =>
                  setPermanentPanel((current) =>
                    current === "websites" ? null : "websites",
                  )
                }
              >
                <strong>Websites</strong>
                <span>
                  {settings.permanentWebsites.length}
                  <small aria-hidden="true" />
                </span>
              </button>

              <div className="permanent-blocking-section-body">
                <div className="blocking-list">
                  {settings.permanentWebsites.length === 0 ? (
                    <div className="blocking-empty">
                      No permanently blocked websites yet.
                    </div>
                  ) : (
                    settings.permanentWebsites.map((website) => (
                      <div className="blocking-row" key={website.id}>
                        <div className="blocking-row-copy">
                          <strong>{website.pattern}</strong>
                          <small>Permanent</small>
                        </div>
                        <Toggle
                          checked={website.enabled}
                          label={`${website.enabled ? "Disable" : "Enable"} permanent block for ${website.pattern}`}
                          onChange={(enabled) =>
                            updatePermanentWebsites(
                              settings.permanentWebsites.map((item) =>
                                item.id === website.id
                                  ? { ...item, enabled }
                                  : item,
                              ),
                            )
                          }
                        />
                        <button
                          className="blocking-remove"
                          type="button"
                          aria-label={`Remove permanent block for ${website.pattern}`}
                          onClick={() => {
                            updatePermanentWebsites(
                              settings.permanentWebsites.filter(
                                (item) => item.id !== website.id,
                              ),
                            );
                            setStatus({
                              text: "Permanent website block removed",
                              tone: "success",
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  className="blocking-add-form"
                  onSubmit={addPermanentWebsite}
                >
                  <input
                    type="text"
                    value={permanentWebsiteInput}
                    placeholder="Add website or URL to block permanently"
                    aria-label="Permanent website or URL"
                    onChange={(event) =>
                      setPermanentWebsiteInput(event.target.value)
                    }
                  />
                  <button
                    className="button button-primary blocking-symbol-button"
                    type="submit"
                    aria-label="Add permanent website"
                  >
                    +
                  </button>
                </form>
              </div>
            </section>

            <section
              className={
                permanentPanel === "apps"
                  ? "permanent-blocking-section is-open"
                  : "permanent-blocking-section"
              }
            >
              <button
                className="permanent-blocking-section-heading"
                type="button"
                aria-expanded={permanentPanel === "apps"}
                onClick={() =>
                  setPermanentPanel((current) =>
                    current === "apps" ? null : "apps",
                  )
                }
              >
                <strong>Apps</strong>
                <span>
                  {settings.permanentApps.length}
                  <small aria-hidden="true" />
                </span>
              </button>

              <div className="permanent-blocking-section-body">
                <div className="blocking-list">
                  {settings.permanentApps.length === 0 ? (
                    <div className="blocking-empty">
                      No permanently blocked apps yet.
                    </div>
                  ) : (
                    settings.permanentApps.map((app) => (
                      <div className="blocking-row" key={app.id}>
                        <div className="blocking-row-copy">
                          <strong>{app.name}</strong>
                          {app.exePath ? <small>{app.exePath}</small> : null}
                        </div>
                        <Toggle
                          checked={app.enabled}
                          label={`${app.enabled ? "Disable" : "Enable"} permanent block for ${app.name}`}
                          onChange={(enabled) =>
                            updatePermanentApps(
                              settings.permanentApps.map((item) =>
                                item.id === app.id ? { ...item, enabled } : item,
                              ),
                            )
                          }
                        />
                        <button
                          className="blocking-remove"
                          type="button"
                          aria-label={`Remove permanent block for ${app.name}`}
                          onClick={() => {
                            updatePermanentApps(
                              settings.permanentApps.filter(
                                (item) => item.id !== app.id,
                              ),
                            );
                            setStatus({
                              text: "Permanent app block removed",
                              tone: "success",
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="installed-app-picker permanent-app-picker">
                  <div className="installed-app-toolbar">
                    <input
                      type="search"
                      value={appSearch}
                      placeholder="Search applications on this PC"
                      aria-label="Search installed applications for permanent blocking"
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

                  <div
                    className="installed-app-list"
                    aria-label="Installed applications for permanent blocking"
                  >
                    {platform === "web" ? (
                      <div className="blocking-empty">
                        Installed applications are available in the desktop app.
                      </div>
                    ) : platform === "other" ? (
                      <div className="blocking-empty">
                        Application discovery is currently available only on
                        Windows.
                      </div>
                    ) : platform === "loading" ? (
                      <div className="blocking-empty">Checking this device...</div>
                    ) : isLoadingApps ? (
                      <div className="blocking-empty">
                        Scanning installed applications...
                      </div>
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
                        const isAdded = settings.permanentApps.some(
                          (app) =>
                            (app.exePath ?? app.name).toLowerCase() === identity,
                        );

                        return (
                          <div
                            className="installed-app-row"
                            key={`permanent-${application.name}|${application.exePath ?? ""}`}
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
                              disabled={isAdded || isRequestingAppPermission}
                              aria-label={`${isAdded ? "Added" : "Add"} permanent block for ${application.name}`}
                              onClick={() => void addPermanentApp(application)}
                            >
                              {isAdded
                                ? "Added"
                                : isRequestingAppPermission
                                  ? "Allowing..."
                                  : "Add"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
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
                disabled={isRequestingNotificationPermission}
                label="Silence system notifications during focus sessions"
                onChange={(silenceDuringFocus) =>
                  void updateSilenceNotifications(silenceDuringFocus)
                }
              />
            </div>
            <div className="notification-option">
              <div>
                <strong>Use Windows Focus / Do Not Disturb when available</strong>
              </div>
              <Toggle
                checked={settings.notifications.useWindowsFocus}
                disabled={isRequestingNotificationPermission}
                label="Use Windows Focus or Do Not Disturb when available"
                onChange={(useWindowsFocus) =>
                  void updateWindowsFocusUsage(useWindowsFocus)
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
                  : "On Windows 11, MonoFocus can request administrator permission once to quiet notifications during focus sessions and restore them afterward."}
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

      </div>
    </section>
  );
}
