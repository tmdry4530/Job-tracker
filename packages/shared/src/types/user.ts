/**
 * User Types
 * 사용자 관련 타입 정의
 */

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}
