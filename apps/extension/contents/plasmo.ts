import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.wanted.co.kr/*", "https://www.saramin.co.kr/*"],
  all_frames: false
}

// Placeholder - 실제 파싱 로직은 Story 3.1, 3.2에서 구현
console.log("Job Application Tracker content script loaded")
