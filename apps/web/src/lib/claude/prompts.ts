function sanitizeJdContent(content: string): string {
  return content
    .replace(/```/g, '｀｀｀')
    .replace(/---+/g, '—')
    .replace(/<[^>]*>/g, '')
    .slice(0, 15000)
}

export const JD_SUMMARY_SYSTEM_PROMPT = `당신은 채용 공고 분석 전문가입니다.
지원자가 이 포지션에 적합한지 빠르게 판단하고 준비할 수 있도록 핵심 정보를 정리해주세요.

다음 형식으로 작성해주세요:

## 💼 한눈에 보는 포지션
(1-2문장으로 이 포지션이 무엇을 하는 역할인지 설명)

## ✅ 반드시 갖춰야 할 것
- (필수 기술/경험 1)
- (필수 기술/경험 2)
- (필수 기술/경험 3)

## ⭐ 있으면 유리한 것
- (우대 기술/경험 1)
- (우대 기술/경험 2)

## 🛠 기술 스택
(언어, 프레임워크, 도구 등 구체적으로 나열)

## 📋 주요 업무
- (핵심 업무 1)
- (핵심 업무 2)
- (핵심 업무 3)

## 🎁 복지 & 특이사항
(연봉, 복지, 팀 문화 등 특이사항 - 있는 경우만)

정보가 명시되지 않은 항목은 생략하세요.
한국어로 작성해주세요.`

export const INTERVIEW_QUESTIONS_SYSTEM_PROMPT = `당신은 채용 면접 전문가입니다.
주어진 Job Description(JD)를 바탕으로 실제 면접에서 나올 수 있는 예상 질문을 생성해주세요.

다음 카테고리별로 질문을 생성해주세요:

1. **technical** (기술 질문): JD에 명시된 기술 스택과 관련된 기술적 질문
2. **experience** (경험 질문): 과거 프로젝트나 업무 경험에 관한 질문
3. **situational** (상황 질문): "~한 상황에서 어떻게 하시겠습니까?" 형태의 질문
4. **general** (일반 질문): 지원 동기, 커리어 목표 등 일반적인 질문

각 카테고리별로 1-3개씩 질문을 생성하세요.
총 7-10개의 질문을 생성해주세요.

응답 형식 (JSON 배열):
[
  {"question": "질문 내용", "category": "technical"},
  {"question": "질문 내용", "category": "experience"},
  ...
]

반드시 유효한 JSON 배열 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.
한국어로 질문을 작성해주세요.`

export function createJdSummaryUserPrompt(jdContent: string, companyName: string, position: string): string {
  const sanitizedJd = sanitizeJdContent(jdContent)
  const sanitizedCompany = companyName.slice(0, 100).replace(/[<>]/g, '')
  const sanitizedPosition = position.slice(0, 100).replace(/[<>]/g, '')

  return `다음은 ${sanitizedCompany}의 ${sanitizedPosition} 포지션 채용 공고입니다:

[JD 시작]
${sanitizedJd}
[JD 끝]

위 채용 공고를 분석하여 핵심 내용을 요약해주세요.`
}

export function createInterviewQuestionsUserPrompt(jdContent: string, companyName: string, position: string): string {
  const sanitizedJd = sanitizeJdContent(jdContent)
  const sanitizedCompany = companyName.slice(0, 100).replace(/[<>]/g, '')
  const sanitizedPosition = position.slice(0, 100).replace(/[<>]/g, '')

  return `다음은 ${sanitizedCompany}의 ${sanitizedPosition} 포지션 채용 공고입니다:

[JD 시작]
${sanitizedJd}
[JD 끝]

위 채용 공고를 바탕으로 면접 예상 질문을 생성해주세요.`
}
