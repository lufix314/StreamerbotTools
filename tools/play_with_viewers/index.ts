import { getClient } from "../../shared/client.js";

function renderQueue(jsonStr: string): void {
  const container = document.getElementById("queue-container");
  const listEl = document.getElementById("queue-list");
  try {
    const viewers = JSON.parse(jsonStr);
    if (!Array.isArray(viewers) || viewers.length === 0) {
      container!.style.display = "none";
      return;
    }
    container!.style.display = "";
    listEl!.innerHTML = "";
    viewers.forEach(function (v, i) {
      const div = document.createElement("div");
      div.className = "viewer-entry";
      if (v.live) {
        const dot = document.createElement("span");
        dot.className = "live-dot";
        div.appendChild(dot);
      }
      const name = document.createElement("span");
      name.textContent = v.name;
      div.appendChild(name);
      div.style.animationDelay =
        i *
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--slide-stagger",
            ),
          ) +
        "s";
      listEl!.appendChild(div);
    });
  } catch (e) {
    container!.style.display = "none";
    console.error("Queue parse error:", (e as Error).message, jsonStr);
  }
}

const client = getClient((client) => {
  client
    .getGlobal("viewerQueue")
    .then((resp) => {
      if (resp && resp.status === "ok" && resp.variable) {
        renderQueue(resp.variable.value?.toString() || "{}");
      } else {
        renderQueue("");
      }
    })
    .catch(function (err) {
      console.error("getGlobal error:", err.message);
      renderQueue("");
    });
});

client.on("Misc.GlobalVariableUpdated", (eventData) => {
  if (eventData.data && eventData.data.name === "viewerQueue") {
    renderQueue(eventData.data.newValue);
  }
});
