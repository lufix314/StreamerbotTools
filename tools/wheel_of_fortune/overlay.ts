import { getClient } from "shared/client";

interface WheelEntry {
  name: string;
  multiplier: number;
}

interface ExtendedWheelEntry extends WheelEntry {
  adjustedMultiplier: number;
}

interface SpinPayload {
  idx: number;
  name: string;
  time: number;
}

interface State {
  entries: WheelEntry[];
  rawEntries: ExtendedWheelEntry[];
  shouldAdjustMultiplier: boolean;
  totalMultiplier: number;
  // currentRotation: number;
  isSpinning: boolean;
  isVisible: boolean;
}

const state: State = {
  entries: [],
  rawEntries: [],
  shouldAdjustMultiplier: false,
  totalMultiplier: 0,
  // currentRotation: 0,
  isSpinning: false,
  isVisible: false,
};

const SPIN_EVENT = "SpinTheWheel";
const ADJUST_PROBS_VAR = "wofAdjustProbs";

const ENTRIES_VAR = "wofEntries";
const COLORS = [
  "--color-1",
  "--color-2",
  "--color-3",
  "--color-4",
  "--color-5",
  "--color-6",
  "--color-7",
  "--color-8",
];

const FADE_DURATION = 1000;

let onHidden = () => {};

function getFadeOutDelay(): number {
  const styles = getComputedStyle(document.documentElement);
  const delay = styles
    .getPropertyValue("--show-result-duration")
    .trim()
    .replace("s", "");
  const parsed = parseFloat(delay);
  return isNaN(parsed) ? 3000 : parsed * 1000;
}

function fadeIn(): Promise<void> {
  return new Promise((resolve) => {
    const container = document.getElementById("container");
    if (!container) {
      resolve();
      return;
    }

    state.isVisible = true;

    container.classList.remove("fade-out");
    container.classList.add("fade-in");
    setTimeout(resolve, FADE_DURATION);
  });
}

function fadeOut(): void {
  const container = document.getElementById("container");
  if (!container) return;
  container.classList.remove("fade-in");
  container.classList.add("fade-out");

  setTimeout(() => {
    onHidden();
    onHidden = () => {};
  }, FADE_DURATION);
}

function showResult(name: string): void {
  const card = document.getElementById("result-card") as HTMLElement;
  const nameEl = card.querySelector(".result-name") as HTMLElement;
  nameEl.textContent = name;
  card.classList.remove("fade-out");
  card.classList.add("fade-in");
}

function hideResult(): void {
  const card = document.getElementById("result-card") as HTMLElement;
  card.classList.remove("fade-in");
  card.classList.add("fade-out");
}

function initCanvas() {
  const container = document.getElementById("container") as HTMLElement;
  const canvas = document.getElementById("wheel") as HTMLCanvasElement;

  const size = Math.min(window.innerWidth, window.innerHeight);
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  canvas.width = size;
  canvas.height = size;

  return canvas;
}

function parseEntries(jsonStr: string): ExtendedWheelEntry[] {
  if (jsonStr.trim() === "") {
    return [];
  }
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse wofEntries:", e);
  }
  return [];
}

function calculateSegmentAngles(
  entries: WheelEntry[],
  totalMultiplier: number,
): {
  startAngle: number;
  endAngle: number;
  entry: WheelEntry;
}[] {
  const segments: {
    startAngle: number;
    endAngle: number;
    entry: WheelEntry;
  }[] = [];
  let currentAngle = -Math.PI / 2;

  for (const entry of entries) {
    const value = entry.multiplier;
    const angle = (value / totalMultiplier) * 2 * Math.PI;
    segments.push({
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      entry,
    });
    currentAngle += angle;
  }

  return segments;
}

function drawWheel(
  ctx: CanvasRenderingContext2D | undefined,
  canvas: HTMLCanvasElement,
) {
  const styles = getComputedStyle(canvas);

  if (!ctx) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.entries.length === 0) {
    return;
  }

  const segments = calculateSegmentAngles(state.entries, state.totalMultiplier);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const colorIndex = i % COLORS.length;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, segment.startAngle, segment.endAngle);
    ctx.closePath();
    ctx.fillStyle = styles.getPropertyValue(COLORS[colorIndex]);
    ctx.fill();
    ctx.strokeStyle = styles.getPropertyValue("--text-color");
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();

    const textAngle = (segment.startAngle + segment.endAngle) / 2;
    const textRadius = radius * 0.9;
    const textX = centerX + Math.cos(textAngle) * textRadius;
    const textY = centerY + Math.sin(textAngle) * textRadius;

    ctx.translate(textX, textY);
    ctx.rotate(textAngle);
    ctx.fillStyle = styles.getPropertyValue("--text-color");
    ctx.font = `bold ${styles.getPropertyValue("--font-size")} ${styles.getPropertyValue("--font")}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.fillText(segment.entry.name, 0, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.1, 0, 2 * Math.PI);
  ctx.fillStyle = styles.getPropertyValue("--text-color");
  ctx.fill();
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function animateSpin(
  targetRotation: number,
  duration: number,
  onComplete: () => void,
) {
  if (state.isSpinning) return;
  state.isSpinning = true;

  const startRotation = 0; // state.currentRotation;
  const rotationDiff = targetRotation - startRotation;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const canvas = document.getElementById("wheel") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutCubic(progress);

    const currentRotation = startRotation + rotationDiff * easedProgress;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(currentRotation);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    drawWheel(ctx, canvas);
    ctx.restore();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // state.currentRotation = targetRotation % (2 * Math.PI);
      state.isSpinning = false;
      onComplete();
    }
  }

  requestAnimationFrame(animate);
}

function getTargetRotation(targetIndex: number): number {
  if (state.entries.length === 0) return 0; // state.currentRotation;

  const segments = calculateSegmentAngles(state.entries, state.totalMultiplier);
  const targetSegment = segments[targetIndex];

  const segmentCenter =
    targetSegment.startAngle +
    Math.random() * (targetSegment.endAngle - targetSegment.startAngle);

  // let currentRotationNormalized = state.currentRotation % (2 * Math.PI);
  // if (currentRotationNormalized < 0) {
  //   currentRotationNormalized += 2 * Math.PI;
  // }

  const fullRotations = Math.ceil(3 + Math.random() * 2);
  const baseRotation = fullRotations * 2 * Math.PI;

  const rotationToTarget = baseRotation; // - currentRotationNormalized;
  const targetAngle = -segmentCenter;

  return rotationToTarget + targetAngle; // + state.currentRotation;
}

async function handleSpinEvent(eventData: any) {
  const ev = eventData.data;
  if (!ev || ev.eventName !== SPIN_EVENT) {
    return;
  }

  const data = ev.args;
  if (!data || typeof data.idx === "undefined") {
    return;
  }

  const payload: SpinPayload = data;
  const totalTime = payload.time * 1000;
  const spinDuration = Math.max(totalTime - FADE_DURATION, 100);

  await fadeIn();

  const targetRotation = getTargetRotation(payload.idx);
  animateSpin(targetRotation, spinDuration, () => {
    showResult(payload.name);
    setTimeout(() => {
      fadeOut();
      hideResult();
    }, getFadeOutDelay());
  });
}

function updateEntries() {
  state.entries = state.rawEntries.map((e) => ({
    name: e.name,
    multiplier: state.shouldAdjustMultiplier
      ? e.adjustedMultiplier
      : e.multiplier,
  }));
  state.totalMultiplier = state.entries.reduce(
    (sum, e) => sum + e.multiplier,
    0,
  );

  const redraw = () => {
    const canvas = initCanvas();
    const ctx = canvas.getContext("2d")!;
    drawWheel(ctx, canvas);
  };

  if (state.isVisible) {
    // Queue redraw after current spin is finished
    onHidden = redraw;
  } else {
    redraw();
  }
}

const client = getClient(() => {
  console.log("Connected to Streamer.bot");
  document.getElementById("no-connection")?.remove();

  client
    .getGlobals()
    .then((resp) => {
      if (resp && resp.status === "ok") {
        state.rawEntries = parseEntries(
          resp.variables[ENTRIES_VAR]?.value?.toString() || "[]",
        );
        state.shouldAdjustMultiplier =
          (resp.variables[ADJUST_PROBS_VAR]?.value?.valueOf() as boolean) ||
          false;

        updateEntries();
      }

      updateEntries();
    })
    .catch(function (err) {
      console.error("getGlobal error:", err.message);
      updateEntries();
    });
});

client.on("Misc.GlobalVariableUpdated", (eventData) => {
  if (eventData.data) {
    if (eventData.data.name === ENTRIES_VAR) {
      state.rawEntries = parseEntries(eventData.data.newValue);
      updateEntries();
    } else if (eventData.data.name === ADJUST_PROBS_VAR) {
      state.shouldAdjustMultiplier = eventData.data.newValue;
      updateEntries();
    }
  }
});

client.on("Custom.CodeEvent", handleSpinEvent);
