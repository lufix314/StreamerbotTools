import { getClient } from "shared/client";

interface QuotePayload {
  quote: string;
  author: string;
  twitchClipId: string | null;
}

const RAND_QUOTE_EVENT = "RandomQuoteSelected";
const TWITCH_GQL_ENDPOINT = "https://gql.twitch.tv/gql";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

function buildClipQuery(clipId: string) {
  return {
    operationName: "VideoAccessToken_Clip",
    variables: { slug: clipId },
    query: `query VideoAccessToken_Clip($slug: ID!) {
      clip(slug: $slug) {
        playbackAccessToken(params: {platform:"web",playerType:"clips-embed-rechat"}) {
          signature value
        }
        videoQualities { frameRate quality sourceURL }
      }
    }`,
  };
}

function buildVideoUrl(clipSource: string, signature: string, token: string) {
  return `${clipSource}?sig=${signature}&token=${encodeURIComponent(token)}`;
}

async function fetchClipData(clipId: string) {
  const query = buildClipQuery(clipId);

  const response = await fetch(TWITCH_GQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      "Client-ID": TWITCH_CLIENT_ID,
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const result = await response.json();
  const clipData = result?.data?.clip;

  if (!clipData) {
    throw new Error("Clip not found");
  }

  return clipData;
}

function selectVideoQuality(clipData: any) {
  const videoQualities = clipData.videoQualities;

  if (!videoQualities?.length) {
    throw new Error("No video qualities available");
  }

  return videoQualities[0];
}

function handleVideoPlay(video: HTMLVideoElement) {
  video.muted = false;
  video.classList.remove("fade-out");
  video.classList.add("fade-in");

  video.play().catch(() => {
    video.muted = true;
    video.play();
  });
}

function handleVideoEnd(video: HTMLVideoElement) {
  setTimeout(() => {
    video.pause();
    video.classList.remove("fade-in");
    video.classList.add("fade-out");
    //video.removeAttribute("src");
    video.load();
  }, 1050);
}

// Play Twitch Clip using inoficial GraphQL API
// Based on the work done in mustachedmaniac.com/extensions/brb-clip-player
async function showClip(clipId: string) {
  try {
    let hasStarted = false;
    let hasEnded = false;

    let lastTime = 0;
    let stallCount = 0;

    const clipData = await fetchClipData(clipId);
    const selectedQuality = selectVideoQuality(clipData);

    const videoUrl = buildVideoUrl(
      selectedQuality.sourceURL,
      clipData.playbackAccessToken.signature,
      clipData.playbackAccessToken.value,
    );

    const video = document.getElementById("clipplayer") as HTMLVideoElement;

    video.src = videoUrl;
    video.preload = "metadata";
    video.load();

    // Stall detection
    const checkInterval = setInterval(() => {
      if (video.paused || video.ended) {
        return;
      }

      const currentTime = video.currentTime;

      if (currentTime === lastTime && hasStarted) {
        stallCount++;
        if (stallCount > 3) {
          video.play().catch(() => {});
          stallCount = 0;
        }
      } else {
        stallCount = 0;
      }

      lastTime = currentTime;
    }, 500);

    video.addEventListener(
      "canplaythrough",
      () => {
        if (!hasStarted) {
          hasStarted = true;
          handleVideoPlay(video);
        }
      },
      { once: true },
    );

    video.addEventListener("suspend", () => {
      if (!hasEnded && hasStarted) {
        video.play();
      }
    });

    video.addEventListener("stalled", () => {
      if (!hasEnded && hasStarted) {
        video.play();
      }
    });

    video.addEventListener("ended", () => {
      if (hasEnded) {
        return;
      }
      hasEnded = true;
      clearInterval(checkInterval);
      handleVideoEnd(video);
    });
  } catch (err) {
    console.error(err);
  }
}

const client = getClient(() => {
  console.log("Connected to Streamer.bot");
  document.getElementById("no-connection")?.remove();
});

function handleCustomCodeEvent(eventData: any) {
  const ev = eventData.data;
  if (!ev || ev.eventName !== RAND_QUOTE_EVENT) {
    return;
  }

  const data = ev.args;
  if (!data) {
    return;
  }

  const payload: QuotePayload = {
    quote: data.quote || "",
    author: data.author || "",
    twitchClipId: data.twitchClipId || null,
  };

  if (payload.twitchClipId) {
    showClip(payload.twitchClipId);
  }
}

client.on("Custom.CodeEvent", handleCustomCodeEvent);
