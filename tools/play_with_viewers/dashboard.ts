import type {
  StreamerbotClient,
  StreamerbotEventPayload,
} from "@streamerbot/client";
import { getClient, doAction } from "shared/client";

/** Viewer in the queue */
interface QueueViewer {
  name: string;
  live: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number;
}

/** Application state */
const state = {
  queue: [] as QueueViewer[],
  drag: { isDragging: false, draggedIndex: -1 } as DragState,
};

/** (Unique) names of different streamerbot actions */
const ACTION_NAMES = {
  SET_QUEUE: "Set Queue",
  SET_LIVE: "Set Live",
  ROTATE_PLAYER: "Rotate Player",
  NEXT_PLAYER: "Next Player",
  OPEN_QUEUE: "Open Queue",
  CLOSE_QUEUE: "Close Queue",
  CLEAR_QUEUE: "Clear Queue",
  SET_QUEUE_MESSAGE: "Set Queue Message",
  KICK_FROM_QUEUE: "Kick from Queue"
} as const;

/** names of streamerbot variables */
const VARIABLE_NAMES = {
  QUEUE: "viewerQueue",
  VIEWER_LIVE: "viewerLive",
  STATE: "viewerQueueOpen",
  QUEUE_MSG: "viewerQueueMsg",
} as const;

/** IDs of different HTML elements used in the dashboard */
const ELEMENT_IDS = {
  QUEUE_LIST: "queue-list",
  VIEWER_LIVE: "viewer-live",
  SAVE_SETTINGS_BTN: "save-settings-btn",
  ROTATE_BTN: "rotate-btn",
  ROTATE_COUNT: "rotate-count",
  NEXT_BTN: "next-btn",
  NEXT_COUNT: "next-count",
  QUEUE_OPEN_TOGGLE: "queue-open-toggle",
  CLEAR_QUEUE_BTN: "clear-queue-btn",
  QUEUE_MSG: "queue-msg",
} as const;

/** Create an item in the queue list */
function createQueueItem(viewer: QueueViewer, index: number): HTMLElement {
  const li = document.createElement("li");
  li.className = "queue-container";

  const itemDiv = document.createElement("div");
  itemDiv.className = "queue-item";
  itemDiv.draggable = true;
  itemDiv.dataset.index = index.toString();

  const infoDiv = document.createElement("div");
  infoDiv.className = "queue-item-info";

  const indexSpan = document.createElement("span");
  indexSpan.className = "queue-item-index";
  indexSpan.textContent = `${index + 1}.`;

  const nameSpan = document.createElement("span");
  nameSpan.className = "queue-item-name";
  nameSpan.textContent = viewer.name;

  infoDiv.appendChild(indexSpan);
  infoDiv.appendChild(nameSpan);

  itemDiv.appendChild(infoDiv)

  // const actionsDiv = document.createElement("div");
  // actionsDiv.className = "queue-item-actions";

  if (viewer.live) {
    const badge = document.createElement("span");
    badge.className = "live-badge";
    badge.textContent = "LIVE";
    itemDiv.appendChild(badge);
  }

  li.appendChild(itemDiv);

  const kickBtn = document.createElement("button");
  kickBtn.className = "kick-btn";
  kickBtn.setAttribute("aria-label", "Remove from queue");
  kickBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  kickBtn.addEventListener("click", () => kickFromQueue(viewer.name, index));
  li.appendChild(kickBtn);

  return li;
}

/** Attaches drag-and-drop event listeners to queue items */
function attachDragEvents(items: NodeListOf<HTMLElement>) {
  items.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("dragenter", handleDragEnter);
    item.addEventListener("dragleave", handleDragLeave);
    item.addEventListener("drop", handleDrop);
  });
}

/** Renders the viewer queue to the DOM */
function renderQueue() {
  const listEl = document.getElementById(ELEMENT_IDS.QUEUE_LIST);
  if (!listEl) return;

  if (state.queue.length === 0) {
    listEl.innerHTML = '<li class="empty-queue">No viewers in queue</li>';
    return;
  }

  listEl.innerHTML = "";
  state.queue.forEach((viewer, index) => {
    const li = createQueueItem(viewer, index);
    listEl.appendChild(li);
  });

  const items = document.querySelectorAll<HTMLElement>(".queue-item");
  attachDragEvents(items);
}

function handleDragStart(e: DragEvent) {
  if (!e.target) return;

  const target = e.target as HTMLElement;
  state.drag.isDragging = true;
  state.drag.draggedIndex = parseInt(target.dataset.index || "-1");

  target.classList.add("dragging");
  e.dataTransfer?.setData("text/plain", "");

  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(e: DragEvent) {
  if (!e.target) return;

  const target = e.target as HTMLElement;
  state.drag.isDragging = false;
  state.drag.draggedIndex = -1;

  target.classList.remove("dragging");
  document.querySelectorAll<HTMLElement>(".queue-item").forEach((item) => {
    item.classList.remove("drag-over");
  });
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();

  if (!e.dataTransfer) return;
  e.dataTransfer.dropEffect = "move";
}

function handleDragEnter(e: DragEvent) {
  if (!e.target || !state.drag.isDragging) return;
  (e.target as HTMLElement).classList.add("drag-over");
}

function handleDragLeave(e: DragEvent) {
  if (!e.target) return;
  (e.target as HTMLElement).classList.remove("drag-over");
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  if (!e.target || state.drag.draggedIndex === -1) return;

  const targetEl = (e.target as HTMLElement).closest<HTMLElement>(
    ".queue-item",
  );
  if (!targetEl) return;

  const targetIndex = parseInt(targetEl.dataset.index || "-1");

  if (state.drag.draggedIndex !== targetIndex && targetIndex >= 0) {
    const { draggedIndex } = state.drag;
    const movedItem = state.queue[draggedIndex];
    state.queue.splice(draggedIndex, 1);
    state.queue.splice(targetIndex, 0, movedItem);
    saveQueue();
  }

  targetEl.classList.remove("drag-over");
}

async function saveQueue() {
  try {
    await doAction(client, ACTION_NAMES.SET_QUEUE, {
      input0: JSON.stringify(state.queue),
    });
  } catch (err) {
    console.error("Failed to save queue:", err);
  }
}

async function kickFromQueue(viewerName: string, index: number) {
  try {
    await doAction(client, ACTION_NAMES.KICK_FROM_QUEUE, {
      input0: viewerName,
    });
    state.queue.splice(index, 1);
    saveQueue();
  } catch (err) {
    console.error("Failed to kick viewer:", err);
  }
}

function setViewerLive(value: number) {
  const input = document.getElementById(
    ELEMENT_IDS.VIEWER_LIVE,
  ) as HTMLInputElement;

  input.value = value.toString();
}

function setQueueOpen(value: boolean) {
  const input = document.getElementById(
    ELEMENT_IDS.QUEUE_OPEN_TOGGLE,
  ) as HTMLInputElement;

  input.checked = value;
}

/** Setup event listeners like button presses and trigger the corresponding action*/
function setupEventListeners() {
  // Save all settings
  const saveSettingsBtn = document.getElementById(
    ELEMENT_IDS.SAVE_SETTINGS_BTN,
  );
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      const liveInput = document.getElementById(
        ELEMENT_IDS.VIEWER_LIVE,
      ) as HTMLInputElement;
      doAction(client, ACTION_NAMES.SET_LIVE, { input0: liveInput.value });

      const msgInput = document.getElementById(
        ELEMENT_IDS.QUEUE_MSG,
      ) as HTMLTextAreaElement;
      doAction(client, ACTION_NAMES.SET_QUEUE_MESSAGE, {
        input0: msgInput.value,
      });
    });
  }

  // Toggle queue open/close (instant)
  const queueOpenToggle = document.getElementById(
    ELEMENT_IDS.QUEUE_OPEN_TOGGLE,
  ) as HTMLInputElement;
  if (queueOpenToggle) {
    queueOpenToggle.addEventListener("change", () => {
      if (queueOpenToggle.checked) {
        doAction(client, ACTION_NAMES.OPEN_QUEUE, {});
      } else {
        doAction(client, ACTION_NAMES.CLOSE_QUEUE, {});
      }
    });
  }

  // Rotate the queue by N players
  const rotateBtn = document.getElementById(ELEMENT_IDS.ROTATE_BTN);
  if (rotateBtn) {
    rotateBtn.addEventListener("click", () => {
      const input = document.getElementById(
        ELEMENT_IDS.ROTATE_COUNT,
      ) as HTMLInputElement;
      doAction(client, ACTION_NAMES.ROTATE_PLAYER, { input0: input.value });
    });
  }

  // Move the queue by N players
  const nextBtn = document.getElementById(ELEMENT_IDS.NEXT_BTN);
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const input = document.getElementById(
        ELEMENT_IDS.NEXT_COUNT,
      ) as HTMLInputElement;
      doAction(client, ACTION_NAMES.NEXT_PLAYER, { input0: input.value });
    });
  }

  // Clear queue
  const clearQueueBtn = document.getElementById(ELEMENT_IDS.CLEAR_QUEUE_BTN);
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener("click", () => {
      doAction(client, ACTION_NAMES.CLEAR_QUEUE, {});
    });
  }
}

async function fetchViewerLive(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.VIEWER_LIVE);
    if (resp?.status === "ok" && resp.variable) {
      setViewerLive((resp.variable.value?.valueOf() as number) || 0);
    }
  } catch (err) {
    setViewerLive(0);
  }
}

async function fetchQueueOpen(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.STATE);
    if (resp?.status === "ok" && resp.variable) {
      setQueueOpen((resp.variable.value?.valueOf() as boolean) || false);
    }
  } catch (err) {
    setQueueOpen(false);
  }
}

async function fetchQueueMsg(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.QUEUE_MSG);
    if (resp?.status === "ok" && resp.variable) {
      setQueueMsg(resp.variable.value?.toString() || "");
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.QUEUE_MSG} error:`, err);
  }
}

function setQueueMsg(value: string) {
  const input = document.getElementById(
    ELEMENT_IDS.QUEUE_MSG,
  ) as HTMLTextAreaElement;
  if (input) {
    input.value = value;
  }
}

async function fetchQueue(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.QUEUE);
    if (resp?.status === "ok" && resp.variable) {
      const jsonStr = resp.variable.value?.toString() || "[]";
      state.queue = JSON.parse(jsonStr);
      if (!Array.isArray(state.queue)) {
        state.queue = [];
      }
    } else {
      state.queue = [];
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.QUEUE} error:`, err);
    state.queue = [];
  }
  renderQueue();
}

function parseQueue(json: string): QueueViewer[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Handles global variable updates from StreamerBot */
function handleGlobalVariableUpdated(
  eventData: StreamerbotEventPayload<"Misc.GlobalVariableUpdated">,
) {
  if (!eventData?.data) return;
  const data = eventData.data;

  const { name, newValue } = data;

  if (name === VARIABLE_NAMES.QUEUE) {
    state.queue = parseQueue(newValue);
    renderQueue();
  } else if (name === VARIABLE_NAMES.VIEWER_LIVE) {
    setViewerLive(newValue);
  } else if (name === VARIABLE_NAMES.STATE) {
    setQueueOpen(newValue);
  } else if (name === VARIABLE_NAMES.QUEUE_MSG) {
    setQueueMsg(newValue);
  }
}

const client = getClient((c) => {
  fetchQueue(c);
  fetchViewerLive(c);
  fetchQueueOpen(c);
  fetchQueueMsg(c);
});

client.on("Misc.GlobalVariableUpdated", handleGlobalVariableUpdated);
document.addEventListener("DOMContentLoaded", setupEventListeners);
