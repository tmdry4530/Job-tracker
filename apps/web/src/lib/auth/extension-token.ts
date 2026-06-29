/**
 * 익스텐션용 Bearer 토큰
 *
 * 익스텐션은 쿠키 세션을 직접 못 쓰므로, 로그인된 웹 세션에서 단기 JWT를 발급받아
 * chrome.storage에 저장하고 웹 API 호출 시 Authorization: Bearer 로 전송한다.
 * AUTH_SECRET으로 서명/검증한다.
 */
import { SignJWT, jwtVerify } from 'jose'

const ISSUER = 'job-tracker'
const AUDIENCE = 'job-tracker-extension'
// 익스텐션 토큰 수명 (서버에서 갱신 엔드포인트로 재발급)
const TOKEN_TTL = '30d'

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET 환경변수가 설정되지 않았습니다.')
  }
  return new TextEncoder().encode(secret)
}

export async function signExtensionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecret())
}

/** 검증 성공 시 userId, 실패 시 null */
export async function verifyExtensionToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    })
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
