export type Scene = {
  bg: string;
  ship: string;
  elements: { style: string; emoji: string }[];
};

export function sceneFor(itinerary: string): Scene {
  const t = itinerary.toLowerCase();
  if (t.includes("alaska")) {
    return {
      bg: "linear-gradient(180deg,#c3dbe6,#6f9bb5 60%,#2f5c74)",
      ship: "🚢",
      elements: [
        { style: "top:14px;right:26px;font-size:22px", emoji: "🦅" },
        { style: "bottom:4px;left:12px;font-size:34px", emoji: "🏔️" },
        { style: "bottom:14px;right:22px;font-size:22px", emoji: "🐋" },
      ],
    };
  }
  if (t.includes("mexic") || t.includes("riviera")) {
    return {
      bg: "linear-gradient(180deg,#ffd7ad,#ff9e7a 48%,#3f8f9c)",
      ship: "⛴️",
      elements: [
        { style: "top:44px;right:30px;font-size:30px", emoji: "🌅" },
        { style: "bottom:8px;left:16px;font-size:28px", emoji: "🌵" },
        { style: "bottom:14px;right:24px;font-size:19px", emoji: "🏖️" },
      ],
    };
  }
  if (t.includes("mediterran")) {
    return {
      bg: "linear-gradient(180deg,#f4e2c0,#e6b877 55%,#3f8f9c)",
      ship: "🛳️",
      elements: [
        { style: "top:15px;right:26px;font-size:24px", emoji: "☀️" },
        { style: "bottom:8px;left:15px;font-size:28px", emoji: "🏛️" },
        { style: "bottom:14px;right:24px;font-size:20px", emoji: "🍋" },
      ],
    };
  }
  if (t.includes("fjord") || t.includes("norw") || t.includes("northern")) {
    return {
      bg: "linear-gradient(180deg,#233a68,#3d5c92 52%,#1f5f6e)",
      ship: "🚢",
      elements: [
        { style: "top:14px;right:26px;font-size:20px", emoji: "🌙" },
        { style: "top:20px;left:22px;font-size:16px", emoji: "✨" },
        { style: "bottom:6px;left:14px;font-size:30px", emoji: "🏔️" },
      ],
    };
  }
  if (t.includes("eastern") || t.includes("island")) {
    return {
      bg: "linear-gradient(180deg,#d4f0ea,#63c3b6 66%,#2f9f95)",
      ship: "🛳️",
      elements: [
        { style: "top:16px;right:26px;font-size:24px", emoji: "⛅" },
        { style: "bottom:6px;left:14px;font-size:30px", emoji: "🏝️" },
        { style: "bottom:16px;right:22px;font-size:20px", emoji: "🐠" },
      ],
    };
  }
  return {
    bg: "linear-gradient(180deg,#cfeef2,#7cc4cf 68%,#4a9fad)",
    ship: "🚢",
    elements: [
      { style: "top:16px;right:24px;font-size:26px", emoji: "☀️" },
      { style: "bottom:8px;left:16px;font-size:30px", emoji: "🌴" },
      { style: "bottom:12px;right:26px;font-size:20px", emoji: "🐬" },
    ],
  };
}
