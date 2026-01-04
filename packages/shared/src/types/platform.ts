/**
 * Platform Types
 * 지원되는 채용 플랫폼 정의
 */

export type Platform = 'wanted' | 'saramin';

export const PLATFORMS = ['wanted', 'saramin'] as const;

export type PlatformType = (typeof PLATFORMS)[number];
