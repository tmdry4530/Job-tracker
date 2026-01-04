/**
 * Date Utilities
 * 날짜 포맷 및 변환 유틸리티
 */

/**
 * ISO 날짜 문자열을 한국 시간대 형식으로 변환
 * @param isoString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷된 날짜 문자열 (예: "2026-01-04")
 */
export function formatDate(isoString: string | null): string {
  if (!isoString) return '-';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\. /g, '-').replace('.', '');
  } catch {
    return '-';
  }
}

/**
 * ISO 날짜 문자열을 날짜/시간 형식으로 변환
 * @param isoString - ISO 8601 형식의 날짜 문자열
 * @returns 포맷된 날짜/시간 문자열 (예: "2026-01-04 14:30")
 */
export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    const dateStr = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\. /g, '-').replace('.', '');

    const timeStr = date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${dateStr} ${timeStr}`;
  } catch {
    return '-';
  }
}

/**
 * 상대적 시간 표시 (예: "3일 전", "방금 전")
 * @param isoString - ISO 8601 형식의 날짜 문자열
 * @returns 상대적 시간 문자열
 */
export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '-';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;
    if (diffWeek < 4) return `${diffWeek}주 전`;
    if (diffMonth < 12) return `${diffMonth}개월 전`;

    return formatDate(isoString);
  } catch {
    return '-';
  }
}

/**
 * 현재 시간을 ISO 문자열로 반환
 * @returns ISO 8601 형식의 현재 시간
 */
export function nowISO(): string {
  return new Date().toISOString();
}
