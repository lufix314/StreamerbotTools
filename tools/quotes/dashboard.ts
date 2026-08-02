import type {
  StreamerbotClient,
  StreamerbotEventPayload,
} from "@streamerbot/client";
import { getClient, doAction } from "shared/client";

/** Quote data structure matching the C# Quote class */
interface Quote {
  quote: string;
  author: string;
  twitchClipId: string | null;
}

/** Application state */
const state = {
  quotes: [] as Quote[],
};

/** (Unique) names of different streamerbot actions */
const ACTION_NAMES = {
  ADD_QUOTE: "Add Quote",
  DELETE_QUOTE: "Delete Quote",
  CLEAR_QUOTES: "Clear Quotes",
} as const;

/** names of streamerbot variables */
const VARIABLE_NAMES = {
  QUOTES: "quotes",
} as const;

/** IDs of different HTML elements used in the dashboard */
const ELEMENT_IDS = {
  ADD_QUOTE_FORM: "add-quote-form",
  QUOTES_LIST: "quotes-list",
  QUOTES_COUNT: "quotes-count",
} as const;

/** Create an item in the quotes list */
function createQuoteItem(quote: Quote, index: number): HTMLElement {
  const li = document.createElement("li");
  li.className = "quotes-container";

  const itemDiv = document.createElement("div");
  itemDiv.className = "quote-item";

  const infoDiv = document.createElement("div");
  infoDiv.className = "quote-item-info";

  const quoteSpan = document.createElement("span");
  quoteSpan.className = "quote-item-quote";
  quoteSpan.textContent = `"${quote.quote}"`;

  const authorSpan = document.createElement("span");
  authorSpan.className = "quote-item-author";
  authorSpan.textContent = `— ${quote.author}`;

  infoDiv.appendChild(quoteSpan);
  infoDiv.appendChild(authorSpan);

  itemDiv.appendChild(infoDiv);

  if (quote.twitchClipId) {
    const clipLink = document.createElement("a");
    clipLink.className = "clip-link";
    clipLink.href = `https://clips.twitch.tv/${quote.twitchClipId}`;
    clipLink.textContent = "Watch Clip";
    clipLink.target = "_blank";
    clipLink.rel = "noopener noreferrer";
    itemDiv.appendChild(clipLink);
  }

  li.appendChild(itemDiv);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.setAttribute("aria-label", "Delete quote");
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  deleteBtn.addEventListener("click", () => removeQuote(index));
  li.appendChild(deleteBtn);

  return li;
}

/** Renders the quotes list to the DOM */
function renderQuotes() {
  const listEl = document.getElementById(ELEMENT_IDS.QUOTES_LIST);
  if (!listEl) return;

  const quoteCountEl = document.getElementById(ELEMENT_IDS.QUOTES_COUNT);
  if (quoteCountEl) {
    quoteCountEl.innerText = `(${state.quotes.length})`;
  }

  if (state.quotes.length === 0) {
    listEl.innerHTML = '<li class="empty-list">No quotes available</li>';
    return;
  }

  listEl.innerHTML = "";
  state.quotes.forEach((quote, index) => {
    const li = createQuoteItem(quote, index);
    listEl.appendChild(li);
  });
}

async function removeQuote(index: number) {
  if (!confirm(`Delete quote #${index}?`)) {
    return;
  }

  try {
    await doAction(client, ACTION_NAMES.DELETE_QUOTE, {
      input0: index,
    });
  } catch (err) {
    console.error("Failed to remove quote:", err);
  }
}

async function addQuote(quoteText: string, author: string, clipId: string) {
  try {
    // Format: "quote" author clipId
    const rawInput = clipId.trim()
      ? `"${quoteText.trim()}" ${author.trim()} ${clipId.trim()}`
      : `"${quoteText.trim()}" ${author.trim()}`;

    await doAction(client, ACTION_NAMES.ADD_QUOTE, {
      rawInput: rawInput,
    });
  } catch (err) {
    console.error("Failed to add quote:", err);
  }
}

/** Setup event listeners like button presses and trigger the corresponding action*/
function setupEventListeners() {
  // Add quote form submit
  const addQuoteForm = document.getElementById(
    ELEMENT_IDS.ADD_QUOTE_FORM,
  ) as HTMLFormElement;
  if (addQuoteForm) {
    addQuoteForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!addQuoteForm.checkValidity()) {
        addQuoteForm.reportValidity();
        return;
      }

      const quoteText =
        addQuoteForm
          .querySelector<HTMLInputElement>('textarea[name="quote"]')
          ?.value.trim() || "";
      const author =
        addQuoteForm
          .querySelector<HTMLInputElement>('input[name="author"]')
          ?.value.trim() || "";
      const clipId =
        addQuoteForm
          .querySelector<HTMLInputElement>('input[name="clipId"]')
          ?.value.trim() || "";

      addQuote(quoteText, author, clipId);
      addQuoteForm.reset();
    });
  }
}

async function fetchQuotes(client: StreamerbotClient) {
  try {
    const resp = await client.getGlobal(VARIABLE_NAMES.QUOTES);
    if (resp?.status === "ok" && resp.variable) {
      const jsonStr = resp.variable.value?.toString() || "[]";
      state.quotes = parseQuotes(jsonStr);
    } else {
      state.quotes = [];
    }
  } catch (err) {
    console.error(`getGlobal ${VARIABLE_NAMES.QUOTES} error:`, err);
    state.quotes = [];
  }
  renderQuotes();
}

function parseQuotes(json: string): Quote[] {
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

  if (name === VARIABLE_NAMES.QUOTES) {
    state.quotes = parseQuotes(newValue);
    renderQuotes();
  }
}

const client = getClient((c) => {
  fetchQuotes(c);
});

client.on("Misc.GlobalVariableUpdated", handleGlobalVariableUpdated);
document.addEventListener("DOMContentLoaded", setupEventListeners);
