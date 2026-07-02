/**
 * 대칭키 암복호화 유틸 (AES-256-GCM)
 *
 * BYOK(Bring Your Own Key) 흐름에서 사용자의 LLM API 키를 DB에 저장하기 전
 * 애플리케이션 레벨에서 암호화한다. 키는 process.env.ENCRYPTION_KEY
 * (base64 인코딩된 32바이트 원시 키)에서 파생한다.
 *
 * - import 시점에는 검증하지 않는다(빌드 단계에서 ENCRYPTION_KEY가 없어도 안전).
 *   실제 encrypt/decrypt 호출 시점에 키를 검증하고, 누락/형식 오류면 명확히 throw.
 * - 저장 포맷: "iv:tag:ciphertext" (각 세그먼트 base64). AES-GCM 이라 무결성(authTag)도 함께 보장.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
/** AES-256 키 길이 (바이트) */
const KEY_LENGTH = 32
/** GCM 권장 IV 길이 (바이트) */
const IV_LENGTH = 12
/** GCM authTag 길이 (바이트) */
const AUTH_TAG_LENGTH = 16
/** 저장 포맷 세그먼트 개수 (iv:tag:ciphertext) */
const SEGMENT_COUNT = 3

/**
 * ENCRYPTION_KEY 환경변수에서 32바이트 키를 파생한다.
 * 호출 시점(런타임)에만 검증하며, 누락/형식 오류면 명확한 에러를 throw.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY is not set. Provide a base64-encoded 32-byte key (generate with: openssl rand -base64 32).'
    )
  }

  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw new Error(
      'ENCRYPTION_KEY is not valid base64. Provide a base64-encoded 32-byte key (generate with: openssl rand -base64 32).'
    )
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes, got ${key.length}. Generate with: openssl rand -base64 32.`
    )
  }

  return key
}

/**
 * 평문을 AES-256-GCM으로 암호화하여 "iv:tag:ciphertext"(각 base64) 문자열로 반환한다.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/**
 * encrypt()가 만든 "iv:tag:ciphertext" 페이로드를 복호화하여 평문을 반환한다.
 * 포맷 오류/무결성 검증 실패 시 throw.
 */
export function decrypt(payload: string): string {
  const key = getKey()

  const segments = payload.split(':')
  if (segments.length !== SEGMENT_COUNT) {
    throw new Error('Invalid encrypted payload format (expected "iv:tag:ciphertext").')
  }

  const [ivB64, tagB64, ctB64] = segments
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')

  if (iv.length !== IV_LENGTH) {
    throw new Error('Invalid encrypted payload: unexpected IV length.')
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted payload: unexpected auth tag length.')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
