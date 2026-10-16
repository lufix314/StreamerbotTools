import type {
  StreamerbotClient,
  StreamerbotEventPayload,
} from "@streamerbot/client";
import { getClient, doAction } from "shared/client";
import { parseJsonArray } from "shared/state";
import { displayFloat } from "shared/utils";

/** Wheel entry data structure matching the C# Quote class */
interface Entry {
  name: string;
  multiplier: number;
  pickCount: number;
  adjustedMultiplier: number;
}

/** Wheel entry data structure used by the import/export */
interface EntryFile {
  name: string;
  multiplier: number;
  pickCount?: number;
}

/** Top-level format of the import/export */
interface EntryFileSet {
  entries: EntryFile[];
}

/** Application state */
const state = {
  adjustProbs: false,
  entries: [] as Entry[],
};

/** (Unique) names of different streamerbot actions */
const ACTION_NAMES = {
  SPIN_WHEEL: "Spin Wheel",
  ADD_ENTRY: "Add WOF Entry",
  REMOVE_ENTRY: "Remove WOF Entry",
  SET_ENTRIES: "Set Entries",
  MANAGE_ADJUST_PROBS: "Manage Probability Decay",
} as const;

/** names of streamerbot variables */
const VARIABLE_NAMES = {
  ENTRIES: "wofEntries",
  ADJUST_PROBS: "wofAdjustProbs",
  DECAY_FACTOR: "wofDecayFactor",
} as const;

/** IDs of different HTML elements used in the dashboard */
const ELEMENT_IDS = {
  ADD_ENTRY_FORM: "add-entry-form",
  ENTRIES_LIST: "entries-list",
  ENTRIES_COUNT: "entries-count",
  ADJUST_PROBS_TOGGLE: "adjust-probs-toggle",
  DECAY_FACTOR_INPUT: "decay-factor",
  RESET_BTN: "reset-btn",
  SPIN_BTN: "spin-btn",
  EXPORT_BTN: "export-btn",
  IMPORT_BTN: "import-btn",
  IMPORT_FILE: "import-file",
} as const;

/** Create an item in the quotes list */
function createWheelEntry(entry: Entry, _: number): HTMLElement {
  const li = document.createElement("li");
  li.className = "entry-container";

  const itemDiv = document.createElement("div");
  itemDiv.className = "entry";

  const nameSpan = document.createElement("span");
  nameSpan.className = "entry-name";
  nameSpan.textContent = `${entry.name}`;

  const multiplierSpan = document.createElement("span");
  multiplierSpan.className = "entry-multiplier";
  multiplierSpan.textContent = state.adjustProbs
    ? `x${entry.multiplier} / x${displayFloat(entry.adjustedMultiplier, 4)}`
    : `x${entry.multiplier}`;

  const pickCountSpan = document.createElement("span");
  pickCountSpan.className = "entry-pick-count";
  pickCountSpan.textContent = `Picked: ${entry.pickCount}`;

  itemDiv.appendChild(nameSpan);
  itemDiv.appendChild(multiplierSpan);
  itemDiv.appendChild(pickCountSpan);

  li.appendChild(itemDiv);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "Delete entry");
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  deleteBtn.addEventListener("click", () => removeEntry(entry.name));
  li.appendChild(deleteBtn);

  return li;
}

/** Renders the quotes list to the DOM */
function renderEntries() {
  const listEl = document.getElementById(ELEMENT_IDS.ENTRIES_LIST);
  if (!listEl) return;

  const quoteCountEl = document.getElementById(ELEMENT_IDS.ENTRIES_COUNT);
  if (quoteCountEl) {
    quoteCountEl.innerText = `(${state.entries.length})`;
  }

  if (state.entries.length === 0) {
    listEl.innerHTML = '<li class="empty-list">No quotes available</li>';
    return;
  }

  listEl.innerHTML = "";
  state.entries.forEach((entry, index) => {
    const li = createWheelEntry(entry, index);
    listEl.appendChild(li);
  });
}

/** Download all wheel entries (name, multiplier, pickCount) as a JSON file */
function exportEntries() {
  const payload: EntryFileSet = {
    entries: state.entries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `wheel-of-fortune-entries-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Parse and validate the contents of an import JSON file */
function parseEntryFile(json: string): EntryFile[] {
  const parsed: unknown = JSON.parse(json);

  const rawEntries = (parsed as EntryFileSet)?.entries;
  if (!Array.isArray(rawEntries)) {
    throw new Error(
      'Expected { "entries": [ ... ] } (or a plain array of entries)',
    );
  }

  const seen = new Set<string>();
  return rawEntries.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.name !== "string" ||
      typeof item.multiplier !== "number" ||
      !Number.isInteger(item.multiplier) ||
      item.multiplier <= 0
    ) {
      throw new Error(`Invalid entry: "${JSON.stringify(item)}"`);
    }

    const entry: EntryFile = {
      name: item.name.trim(),
      multiplier: item.multiplier,
    };
    if (typeof item.pickCount === "number") {
      entry.pickCount = item.pickCount;
    }

    if (seen.has(entry.name)) {
      throw new Error(`Duplicate entry name: "${entry.name}"`);
    }
    seen.add(entry.name);

    return entry;
  });
}

/** Import the full entry list from a JSON file */
async function importEntries(file: File) {
  let entries: EntryFile[];
  try {
    entries = parseEntryFile(await file.text());
  } catch (err) {
    console.error("Failed to parse entries:", err);
    return;
  }

  const importBtn = document.getElementById(
    ELEMENT_IDS.IMPORT_BTN,
  ) as HTMLButtonElement;
  if (importBtn) importBtn.disabled = true;

  try {
    await doAction(client, ACTION_NAMES.SET_ENTRIES, {
      // JSON array matching the bot's Entry class, pickCount optional
      rawInput: JSON.stringify(
        entries.map(({ name, multiplier, pickCount }) => ({
          name,
          multiplier,
          pickCount: pickCount ?? 0,
        })),
      ),
    });
  } catch (err) {
    console.error("Failed to import entries:", err);
  } finally {
    if (importBtn) importBtn.disabled = false;
  }

  await fetchEntries(client);
  renderEntries();
}

async function removeEntry(name: string) {
  if (!confirm(`Delete entry "${name}"?`)) {
    return;
  }

  try {
    await doAction(client, ACTION_NAMES.REMOVE_ENTRY, {
      rawInput: `"${name}"`,
    });
  } catch (err) {
    console.error("Failed to remove entry:", err);
  }
}

async function addEntry(name: string, multiplier: string) {
  try {
    // Format: "quote" author clipId
    const rawInput = `"${name.trim()}" ${multiplier}`;

    const idx = state.entries.findIndex((entry) => entry.name === name.trim());
    if (idx >= 0) {
      alert(
        `Could not create Entry! Entry with the name "${name.trim()}" already exists.`,
      );
      return;
    }

    await doAction(client, ACTION_NAMES.ADD_ENTRY, {
      rawInput: rawInput,
    });
  } catch (err) {
    console.error("Failed to add entry:", err);
  }
}

/** Setup event listeners like button presses and trigger the corresponding action*/
function setupEventListeners() {
  // Add wheel entry form submit
  const addWhelEntryForm = document.getElementById(
    ELEMENT_IDS.ADD_ENTRY_FORM,
  ) as HTMLFormElement;
  addWhelEntryForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!addWhelEntryForm.checkValidity()) {
      addWhelEntryForm.reportValidity();
      return;
    }

    const name =
      addWhelEntryForm
        .querySelector<HTMLInputElement>('input[name="name"]')
        ?.value.trim() || "";
    const multiplier =
      addWhelEntryForm.querySelector<HTMLInputElement>(
        'input[name="multiplier"]',
      )?.value || "1";

    addEntry(name, multiplier);
    addWhelEntryForm.reset();
  });

  // Add quick actions
  const adjustProbsToggle = document.getElementById(
    ELEMENT_IDS.ADJUST_PROBS_TOGGLE,
  ) as HTMLInputElement;
  adjustProbsToggle.addEventListener("change", () => {
    doAction(client, ACTION_NAMES.MANAGE_ADJUST_PROBS, {
      input0: adjustProbsToggle.checked ? "on" : "off",
    });
  });

  const decayFactor = document.getElementById(
    ELEMENT_IDS.DECAY_FACTOR_INPUT,
  ) as HTMLInputElement;
  decayFactor.addEventListener("change", () => {
    doAction(client, ACTION_NAMES.MANAGE_ADJUST_PROBS, {
      input0: decayFactor.value,
    });
  });

  const resetBtn = document.getElementById(
    ELEMENT_IDS.RESET_BTN,
  ) as HTMLButtonElement;
  resetBtn.addEventListener("click", () => {
    doAction(client, ACTION_NAMES.MANAGE_ADJUST_PROBS, {
      input0: "reset",
    });
  });

  const spinBtn = document.getElementById(
    ELEMENT_IDS.SPIN_BTN,
  ) as HTMLButtonElement;
  spinBtn.addEventListener("click", () => {
    doAction(client, ACTION_NAMES.SPIN_WHEEL, {}, false);
  });

  // Import / Export
  const exportBtn = document.getElementById(
    ELEMENT_IDS.EXPORT_BTN,
  ) as HTMLButtonElement;
  exportBtn.addEventListener("click", exportEntries);

  const importBtn = document.getElementById(
    ELEMENT_IDS.IMPORT_BTN,
  ) as HTMLButtonElement;
  const importFile = document.getElementById(
    ELEMENT_IDS.IMPORT_FILE,
  ) as HTMLInputElement;
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", () => {
    const file = importFile.files?.[0];
    if (file) importEntries(file);
    importFile.value = "";
  });
}

async function fetchEntries(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.ENTRIES);
    if (resp?.status === "ok" && resp.variable) {
      const jsonStr = resp.variable.value?.toString() || "[]";
      state.entries = parseJsonArray(jsonStr);
    } else {
      state.entries = [];
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.ENTRIES} error:`, err);
    state.entries = [];
  }
}

/** Populate quick action inputs with initial values from Streamerbot */
async function populateQuickActions(client: StreamerbotClient) {
  const decayFactor = document.getElementById(
    ELEMENT_IDS.DECAY_FACTOR_INPUT,
  ) as HTMLInputElement;

  const adjustProbsToggle = document.getElementById(
    ELEMENT_IDS.ADJUST_PROBS_TOGGLE,
  ) as HTMLInputElement;

  try {
    {
      const resp = await client.getGlobal(VARIABLE_NAMES.DECAY_FACTOR);

      if (resp?.status === "ok" && resp.variable) {
        decayFactor.value = displayFloat(
          Number(resp.variable.value?.toString() || "0.8"),
          4,
        );
      } else {
        decayFactor.value = "0.8";
      }
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.DECAY_FACTOR} error:`, err);

    decayFactor.value = "0.8";
  }

  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.ADJUST_PROBS);

    if (resp?.status === "ok" && resp.variable) {
      const value = (resp.variable.value?.valueOf() as boolean) || false;

      adjustProbsToggle.checked = value;
      state.adjustProbs = value;
    } else {
      adjustProbsToggle.checked = false;
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.ADJUST_PROBS} error:`, err);

    adjustProbsToggle.checked = false;
  }
}

/** Handles global variable updates from StreamerBot */
function handleGlobalVariableUpdated(
  eventData: StreamerbotEventPayload<"Misc.GlobalVariableUpdated">,
) {
  if (!eventData?.data) return;
  const data = eventData.data;

  const { name, newValue } = data;

  if (name === VARIABLE_NAMES.ENTRIES) {
    state.entries = parseJsonArray(newValue);
    renderEntries();
  }

  // Populate Quick Actions
  if (name === VARIABLE_NAMES.DECAY_FACTOR) {
    const decayFactor = document.getElementById(
      ELEMENT_IDS.DECAY_FACTOR_INPUT,
    ) as HTMLInputElement;
    decayFactor.value = displayFloat(Number(newValue), 4);
  }

  if (name === VARIABLE_NAMES.ADJUST_PROBS) {
    const adjustProbsToggle = document.getElementById(
      ELEMENT_IDS.ADJUST_PROBS_TOGGLE,
    ) as HTMLInputElement;
    adjustProbsToggle.checked = newValue;
    state.adjustProbs = newValue;
    renderEntries();
  }
}

const client = getClient((c) => {
  Promise.all([fetchEntries(c), populateQuickActions(c)]).then(() =>
    renderEntries(),
  );
});

client.on("Misc.GlobalVariableUpdated", handleGlobalVariableUpdated);
document.addEventListener("DOMContentLoaded", setupEventListeners);
