/**
 * Platform Types
 * 지원되는 채용 플랫폼 정의
 */

export type Platform = 'wanted' | 'saramin' | 'jobkorea';

export const PLATFORMS = ['wanted', 'saramin', 'jobkorea'] as const;

export type PlatformType = (typeof PLATFORMS)[number];
