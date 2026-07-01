/**
 * 잡코리아 스크랩 페이지 파싱 유틸 (순수 DOM 추출)
 *
 * content script(`contents/jobkorea.ts`)에서 재사용하며, DOM 노드만 입력으로 받는
 * 순수 함수로 구성하여 jsdom 기반 단위 테스트가 가능하도록 분리한다.
 *
 * DOM 구조:
 *   div.tableList.scrap-list
 *     └── form                       (스크랩 목록 전체를 감싸는 단일 form)
 *          └── div.col.infoCol       (공고 1건의 정보 영역)
 *               ├── strong.titArea
 *               │   └── a[href="/Recruit/GI_Read/..."] (공고 제목)
 *               └── ul.list-inline
 *                    └── li > a[href*="/Co_read"] (회사명)
 */

import type { ParsedApplication } from './types'

/** 스크랩 목록 컨테이너 셀렉터 */
export const SCRAP_LIST_SELECTORS = [
  'div.tableList.scrap-list',
  '.scrap-list',
  '.tableList',
]

/**
 * infoCol 요소를 감싸는 행(row) 노드를 반환한다.
 *
 * 잡코리아 스크랩 목록은 전체가 하나의 `<form>`으로 감싸여 있어
 * `item.closest('form')`을 사용하면 모든 항목이 동일한 form을 가리킨다.
 * 따라서 form을 그대로 쓰지 않고, 각 infoCol의 실제 행 컨테이너(tr/li/직계 부모)를
 * 우선적으로 사용해 항목별로 스코프를 좁힌다.
 */
function getItemRow(item: Element): Element {
  return (
    item.closest('tr') ||
    item.closest('li') ||
    item.closest('.col-wrap') ||
    item.parentElement ||
    item
  )
}

/**
 * .col.infoCol 요소에서 공고 1건의 데이터 추출
 *
 * 회사명은 반드시 해당 항목(item) 또는 항목의 행(row) 스코프 내에서만 조회한다.
 * document 스코프나 목록 전체를 감싸는 form 스코프에서 조회하면
 * 항상 첫 번째 공고의 회사명이 반환되므로 절대 사용하지 않는다.
 */
export function parseInfoColItem(item: Element): ParsedApplication | null {
  // 공고 제목 (포지션): strong.titArea > a[href*="/Recruit/GI_Read"]
  const positionEl =
    item.querySelector('strong.titArea a[href*="/Recruit/GI_Read"]') ||
    item.querySelector('a[href*="/Recruit/GI_Read"]') ||
    item.querySelector('.titArea a')
  const position = positionEl?.textContent?.trim() || ''

  // 공고 URL
  let sourceUrl = ''
  if (positionEl) {
    const href = positionEl.getAttribute('href') || ''
    sourceUrl = href.startsWith('http') ? href : `https://www.jobkorea.co.kr${href}`
  }

  // 회사명: 항목(item) 스코프에서 먼저 찾고, 없으면 항목의 행(row) 스코프로만 확장한다.
  // (목록 전체 form 스코프에서 찾으면 첫 항목 회사명이 모든 항목에 복제되는 버그 발생)
  const row = getItemRow(item)
  const companyEl =
    item.querySelector('a[href*="/Co_read"]') ||
    item.querySelector('a[href*="/Recruit/Co_Read"]') ||
    item.querySelector('ul.list-inline li:first-child a') ||
    row.querySelector('a[href*="/Co_read"]') ||
    row.querySelector('a[href*="/Recruit/Co_Read"]')
  const companyName = companyEl?.textContent?.trim() || ''

  if (!position) {
    return null
  }

  return {
    companyName: companyName || '알 수 없음',
    position,
    savedAt: new Date().toISOString().split('T')[0],
    sourceUrl,
    platform: 'jobkorea',
  }
}

/**
 * 스크랩 목록 컨테이너(root)에서 모든 공고를 파싱한다.
 *
 * @param root 조회 스코프 (기본값: document). 테스트 시 임의의 노드 주입 가능
 */
export function parseJobkoreaScrapList(
  root: ParentNode = document
): ParsedApplication[] {
  const applications: ParsedApplication[] = []

  // 정확한 셀렉터: div.tableList.scrap-list .col.infoCol
  let infoItems = root.querySelectorAll('div.tableList.scrap-list .col.infoCol')

  // fallback: .infoCol만 사용
  if (infoItems.length === 0) {
    infoItems = root.querySelectorAll('.infoCol')
  }

  infoItems.forEach((item) => {
    const app = parseInfoColItem(item)
    if (app) {
      applications.push(app)
    }
  })

  return applications
}

/**
 * 중복 제거
 */
export function deduplicateApplications(
  applications: ParsedApplication[]
): ParsedApplication[] {
  const seen = new Set<string>()
  return applications.filter((app) => {
    const key = app.sourceUrl || `${app.companyName}-${app.position}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
