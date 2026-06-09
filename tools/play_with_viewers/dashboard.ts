import type { StreamerbotClient } from "@streamerbot/client";
import { getClient, doAction } from "shared/client.js";

let currentQueue: QueueViewer[] = [];

let isDragging = false;
let draggedIndex = -1;

interface QueueViewer {
  name: string;
  live: boolean;
}

function renderQueue() {
  const listEl = document.getElementById("queue-list");
  if (!listEl) return;

  if (currentQueue.length === 0) {
    listEl.innerHTML = '<li class="empty-queue">No viewers in queue</li>';
    return;
  }

  listEl.innerHTML = "";
  currentQueue.forEach((viewer, index) => {
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

    listEl.appendChild(li);
  });

  const items = document.querySelectorAll(
    ".queue-item",
  ) as NodeListOf<HTMLElement>;

  items.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("dragenter", handleDragEnter);
    item.addEventListener("dragleave", handleDragLeave);
    item.addEventListener("drop", handleDrop);
  });
}

function handleDragStart(e: DragEvent) {
  if (!e.target) return;
  isDragging = true;
  draggedIndex = parseInt((e.target as HTMLElement).dataset.index || "-1");

  (e.target as HTMLElement).classList.add("dragging");
  if (e.dataTransfer) {
    e.dataTransfer.setData("text/plain", "");
    e.dataTransfer.effectAllowed = "move";
  }
}

function handleDragEnd(e: DragEvent) {
  if (!e.target) return;
  isDragging = false;
  draggedIndex = -1;

  (e.target as HTMLElement).classList.remove("dragging");
  document.querySelectorAll(".queue-item").forEach((item) => {
    item.classList.remove("drag-over");
  });
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
}

function handleDragEnter(e: DragEvent) {
  if (!e.target || !isDragging) return;
  (e.target as HTMLElement).classList.add("drag-over");
}

function handleDragLeave(e: DragEvent) {
  if (!e.target) return;
  (e.target as HTMLElement).classList.remove("drag-over");
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  if (!e.target || draggedIndex === -1) return;

  const targetEl = (e.target as HTMLElement).closest(
    ".queue-item",
  ) as HTMLElement;
  if (!targetEl) return;

  const targetIndex = parseInt(targetEl.dataset.index || "-1");

  if (draggedIndex !== targetIndex && targetIndex >= 0) {
    const movedItem = currentQueue[draggedIndex];
    currentQueue.splice(draggedIndex, 1);
    currentQueue.splice(targetIndex, 0, movedItem);

    saveQueue();
  }

  targetEl.classList.remove("drag-over");
}

async function saveQueue() {
  try {
    const queueJson = JSON.stringify(currentQueue);
    await doAction(client, "Set Queue", { input0: queueJson });
  } catch (err) {
    console.error("Failed to save queue:", err);
  }
}

function setViewerLive(value: string) {
  const value_num = parseInt(value, 10);

  const input = document.getElementById("viewer-live") as HTMLInputElement;
  if (!isNaN(value_num)) {
    input.value = value;
  }
}

function setupEventListeners() {
  const saveLiveBtn = document.getElementById("save-live-btn");
  if (saveLiveBtn) {
    saveLiveBtn.addEventListener("click", () => {
      const input = document.getElementById("viewer-live") as HTMLInputElement;
      doAction(client, "Set Live", { input0: input.value });
    });
  }

  const rotateBtn = document.getElementById("rotate-btn");
  if (rotateBtn) {
    rotateBtn.addEventListener("click", () => {
      const input = document.getElementById("rotate-count") as HTMLInputElement;
      doAction(client, "Rotate Player", { input0: input.value });
    });
  }

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const input = document.getElementById("next-count") as HTMLInputElement;
      doAction(client, "Next Player", { input0: input.value });
    });
  }
}

function fetchViewerLive(client: StreamerbotClient) {
  client
    .getGlobal("viewerLive")
    .then((resp) => {
      if (resp && resp.status === "ok" && resp.variable) {
        setViewerLive(resp.variable.value?.toString() || "1");
      }
    })
    .catch((err) => {
      console.error("getGlobal viewerLive error:", err.message);
    });
}

function fetchQueue(client: StreamerbotClient) {
  client
    .getGlobal("viewerQueue")
    .then((resp) => {
      if (resp && resp.status === "ok" && resp.variable) {
        const jsonStr = resp.variable.value?.toString() || "[]";
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            currentQueue = parsed;
          } else {
            currentQueue = [];
          }
        } catch {
          currentQueue = [];
        }
      } else {
        currentQueue = [];
      }
      renderQueue();
    })
    .catch((err) => {
      console.error("getGlobal viewerQueue error:", err.message);
      currentQueue = [];
      renderQueue();
    });
}

const client = getClient((c) => {
  fetchQueue(c);
  fetchViewerLive(c);
});

client.on("Misc.GlobalVariableUpdated", (eventData) => {
  if (eventData.data) {
    if (eventData.data.name === "viewerQueue") {
      try {
        const parsed = JSON.parse(eventData.data.newValue);
        if (Array.isArray(parsed)) {
          currentQueue = parsed;
        }
      } catch {
        currentQueue = [];
      }
      renderQueue();
    } else if (eventData.data.name === "viewerLive") {
      setViewerLive(eventData.data.newValue);
    }
  }
});

document.addEventListener("DOMContentLoaded", setupEventListeners);
