export {}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Application Tracker Extension installed")
})

// 추후 구현될 기능:
// - 세션 토큰 관리 (Story 2.5)
// - 데이터 동기화 (Story 3.3)
// - 뱃지 업데이트 (Story 3.4)
