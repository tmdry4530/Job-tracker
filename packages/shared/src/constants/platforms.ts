/**
 * Platform Constants
 * 채용 플랫폼 관련 상수
 */

import type { Platform } from '../types';

export const PLATFORM_LABELS: Record<Platform, string> = {
  wanted: '원티드',
  saramin: '사람인',
  jobkorea: '잡코리아',
} as const;

export const PLATFORM_URLS: Record<Platform, string> = {
  wanted: 'https://www.wanted.co.kr',
  saramin: 'https://www.saramin.co.kr',
  jobkorea: 'https://www.jobkorea.co.kr',
} as const;

export const PLATFORM_APPLICATION_URLS: Record<Platform, string> = {
  wanted: 'https://www.wanted.co.kr/cv/applications',
  saramin: 'https://www.saramin.co.kr/zf_user/applyin-status',
  jobkorea: 'https://www.jobkorea.co.kr/User/Scrap',
} as const;

export const PLATFORM_COLORS: Record<Platform, string> = {
  wanted: '#3366FF',
  saramin: '#00A1E4',
  jobkorea: '#E32D2D',
} as const;
