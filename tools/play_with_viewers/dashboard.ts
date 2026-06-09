import type {
  StreamerbotClient,
  StreamerbotEventPayload,
} from "@streamerbot/client";
import { getClient, doAction } from "shared/client.js";

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
} as const;

/** names of streamerbot variables */
const VARIABLE_NAMES = {
  VIEWER_QUEUE: "viewerQueue",
  VIEWER_LIVE: "viewerLive",
} as const;

/** IDs of different HTML elements used in the dashboard */
const ELEMENT_IDS = {
  QUEUE_LIST: "queue-list",
  VIEWER_LIVE: "viewer-live",
  SAVE_LIVE_BTN: "save-live-btn",
  ROTATE_BTN: "rotate-btn",
  ROTATE_COUNT: "rotate-count",
  NEXT_BTN: "next-btn",
  NEXT_COUNT: "next-count",
} as const;

/** Create an item in the queue list */
function createQueueItem(viewer: QueueViewer, index: number): HTMLElement {
  const li = document.createElement("li");
  li.className = "queue-item";
  li.draggable = true;
  li.dataset.index = index.toString();

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
  li.appendChild(infoDiv);

  if (viewer.live) {
    const badge = document.createElement("span");
    badge.className = "live-badge";
    badge.textContent = "LIVE";
    li.appendChild(badge);
  }

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

function setViewerLive(value: string) {
  const valueNum = parseInt(value, 10);
  const input = document.getElementById(
    ELEMENT_IDS.VIEWER_LIVE,
  ) as HTMLInputElement;

  if (!isNaN(valueNum)) {
    input.value = value;
  }
}

/** Setup event listeners like button presses and trigger the corresponding action*/
function setupEventListeners() {
  // Set the number of live viewers
  const saveLiveBtn = document.getElementById(ELEMENT_IDS.SAVE_LIVE_BTN);
  if (saveLiveBtn) {
    saveLiveBtn.addEventListener("click", () => {
      const input = document.getElementById(
        ELEMENT_IDS.VIEWER_LIVE,
      ) as HTMLInputElement;
      doAction(client, ACTION_NAMES.SET_LIVE, { input0: input.value });
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
}

async function fetchViewerLive(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.VIEWER_LIVE);
    if (resp?.status === "ok" && resp.variable) {
      setViewerLive(resp.variable.value?.toString() || "1");
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.VIEWER_LIVE} error:`, err);
  }
}

async function fetchQueue(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.VIEWER_QUEUE);
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
    console.error(`getGlobal ${VARIABLE_NAMES.VIEWER_QUEUE} error:`, err);
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

  if (name === VARIABLE_NAMES.VIEWER_QUEUE) {
    state.queue = parseQueue(newValue);
    renderQueue();
  } else if (name === VARIABLE_NAMES.VIEWER_LIVE) {
    setViewerLive(newValue);
  }
}

const client = getClient((c) => {
  fetchQueue(c);
  fetchViewerLive(c);
});

client.on("Misc.GlobalVariableUpdated", handleGlobalVariableUpdated);
document.addEventListener("DOMContentLoaded", setupEventListeners);
