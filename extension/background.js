importScripts("config.js");

const RULE_ID_START = 1000;
const RULE_ID_END = 1999;
const SYNC_ALARM = "monofocus-sync";
const POLL_INTERVAL_MS = 3000;
let pollTimer = null;

const normalizePattern = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const createRules = (patterns) =>
  patterns
    .map(normalizePattern)
    .filter(Boolean)
    .slice(0, 1000)
    .map((pattern, index) => ({
      id: RULE_ID_START + index,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: "/blocked.html"
        }
      },
      condition: {
        urlFilter: pattern.includes("/") ? `||${pattern}` : `||${pattern}^`,
        resourceTypes: ["main_frame"]
      }
    }));

const getManagedRuleIds = async () => {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules
    .map((rule) => rule.id)
    .filter((id) => id >= RULE_ID_START && id <= RULE_ID_END);
};

const applyRules = async (patterns) => {
  const rules = createRules(patterns);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: await getManagedRuleIds(),
    addRules: rules
  });
};

const clearRules = async () => {
  const ruleIds = await getManagedRuleIds();
  if (ruleIds.length === 0) {
    return;
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIds
  });
};

const syncFromMonoFocus = async () => {
  const config = globalThis.MONOFOCUS_CONFIG;
  if (!config?.endpoint || !config?.token) {
    await clearRules();
    return;
  }

  try {
    const response = await fetch(config.endpoint, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`MonoFocus bridge returned ${response.status}`);
    }

    const state = await response.json();
    const patterns =
      state.active && Array.isArray(state.websites) ? state.websites : [];
    await applyRules(patterns);
    await chrome.storage.local.set({
      connected: true,
      active: Boolean(state.active),
      blockedCount: patterns.length,
      lastSync: Date.now()
    });
  } catch {
    await clearRules();
    await chrome.storage.local.set({
      connected: false,
      active: false,
      blockedCount: 0,
      lastSync: Date.now()
    });
  }
};

const startPolling = () => {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
  }

  void syncFromMonoFocus();
  pollTimer = setInterval(() => void syncFromMonoFocus(), POLL_INTERVAL_MS);
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 0.5 });
  startPolling();
});

chrome.runtime.onStartup.addListener(startPolling);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    void syncFromMonoFocus();
  }
});

startPolling();
