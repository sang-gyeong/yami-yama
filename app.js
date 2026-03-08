const sampleJson = [
  {
    type: 'multiple',
    question: 'HTTP 상태코드 404의 의미는?',
    choices: ['요청 성공', '서버 오류', '리소스를 찾을 수 없음', '권한 없음'],
    answer: '리소스를 찾을 수 없음',
    explanation:
      '404 Not Found는 서버에 요청한 리소스가 존재하지 않을 때 사용됩니다.',
  },
  {
    type: 'short',
    question:
      'CSS에서 요소를 가로 중앙 정렬할 때 자주 사용하는 속성 조합은? (블록 요소 기준)',
    answer: 'margin: 0 auto',
    explanation:
      '너비가 있는 블록 요소의 좌우 마진을 auto로 설정하면 가로 중앙 정렬됩니다.',
  },
  {
    type: 'essay',
    question: '웹 접근성이 중요한 이유를 한 줄로 설명해보세요.',
    answer: ['모든 사용자가 서비스에 접근하고 이용할 수 있어야 하기 때문'],
    explanation:
      '서술형은 예시 정답과 동일한 의미를 입력하면 됩니다. 정답 후보를 여러 개 넣어둘 수 있습니다.',
  },
];

const STORAGE_KEY = 'yami-yama.savedSets.v1';
const REMOTE_BASE_URL = 'https://yami-yama-default-rtdb.firebaseio.com';

const STORAGE_LIST_ENDPOINT =
  'https://firebasestorage.googleapis.com/v0/b/yami-yama.firebasestorage.app/o?maxResults=1000';

function buildStorageMediaUrl(name) {
  return `https://firebasestorage.googleapis.com/v0/b/yami-yama.firebasestorage.app/o/${encodeURIComponent(
    name,
  )}?alt=media`;
}

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: 'immediate',
  round: 1,
  currentScreen: 'setup',
  pendingSavePayload: null,
  activeQuizType: 'json',
};

const setupScreen = document.getElementById('setup-screen');
const imageSetupScreen = document.getElementById('image-setup-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const jsonInput = document.getElementById('json-input');
const imageSetupError = document.getElementById('image-setup-error');
const openJsonQuizBtn = document.getElementById('open-json-quiz-btn');
const openImageQuizBtn = document.getElementById('open-image-quiz-btn');
const startImageQuizBtn = document.getElementById('start-image-quiz-btn');
const questionMedia = document.getElementById('question-media');
const saveSetBtn = document.getElementById('save-set-btn');
const saveSetModal = document.getElementById('save-set-modal');
const saveSetModalInput = document.getElementById('save-set-modal-input');
const saveSetConfirmBtn = document.getElementById('save-set-confirm-btn');
const saveSetCancelBtn = document.getElementById('save-set-cancel-btn');
const jsonExample = document.getElementById('json-example');
const setupError = document.getElementById('setup-error');
const promptTemplate = document.getElementById('prompt-template');
const realExamPromptTemplateEl = document.getElementById('real-exam-prompt-template');
const copyPromptBtn = document.getElementById('copy-prompt-btn');
const copyFeedback = document.getElementById('copy-feedback');
const copyRealExamPromptBtn = document.getElementById('copy-real-exam-prompt-btn');
const realExamCopyFeedback = document.getElementById('real-exam-copy-feedback');
const copyJsonBtn = document.getElementById('copy-json-btn');
const jsonCopyFeedback = document.getElementById('json-copy-feedback');
const openGuideBtn = document.getElementById('open-guide-btn');
const closeGuideBtn = document.getElementById('close-guide-btn');
const guideModal = document.getElementById('guide-modal');
const savedSetList = document.getElementById('saved-set-list');
const refreshSavedBtn = document.getElementById('refresh-saved-btn');
const firebaseDbUrlInput = document.getElementById('firebase-db-url');
const saveRemoteConfigBtn = document.getElementById('save-remote-config-btn');
const pushRemoteBtn = document.getElementById('push-remote-btn');
const pullRemoteBtn = document.getElementById('pull-remote-btn');
const remoteSyncFeedback = document.getElementById('remote-sync-feedback');

const progressText = document.getElementById('progress-text');
const modeBadge = document.getElementById('mode-badge');
const questionTitle = document.getElementById('question-title');
const questionText = document.getElementById('question-text');
const answerArea = document.getElementById('answer-area');
const feedbackBox = document.getElementById('feedback-box');

const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const examActions = document.getElementById('exam-actions');

const resultSummary = document.getElementById('result-summary');
const resultList = document.getElementById('result-list');
const motivation = document.getElementById('motivation');

const medicalPromptTemplate = `너는 의대 시험 출제 전문가이자 문항 검수자다.
내가 제공하는 자료는 (1) 기출문제/족보(야마) (2) 교안 (3) 교재 발췌다.

목표: **야마의 출제 스타일과 ‘유형별 출제 비율’까지 반드시 따라** 예상문제 세트를 만들고,
출력은 아래 JSON 형식으로만 반환한다.

[사용자 입력(선택)]
- 총 문항 수: {TOTAL}
※ 사용자가 {TOTAL}을 제공하지 않으면, **총 문항 수는 20으로 간주**하고 진행하라.

[핵심 규칙: 야마 기반 자동 비율 결정]
1) 너는 야마를 먼저 분석해, 실제 야마에서의 문항 유형 비율을 추정하라.
   - multiple(오지선다 객관식) 비율 %
   - short(단답형 주관식) 비율 %
   - essay(서술형) 비율 %
2) 생성할 문항의 유형 개수는 위 비율을 총 문항 수에 적용해 자동으로 결정하라.
   - 반올림으로 인해 합이 총 문항 수와 다르면, 야마에서 더 흔한 유형부터 1개씩 가감하여 정확히 맞춰라.
3) 만약 야마가 사실상 객관식만 출제한다면: 총 문항 수 전부를 객관식으로 구성하라.
4) 만약 야마에서 주관식(단답/서술)이 “약 10%”처럼 일정 경향이 보인다면:
   - 총 문항 수의 약 10%를 주관식으로 자동 배정하고(단답/서술 비율도 야마 경향대로),
   - 나머지는 객관식으로 구성하라.
5) 위 ‘비율 추정/계산 과정’은 **출력에 절대 쓰지 말 것**(내부적으로만 수행).

[야마 출제 스타일 “필수 준수” 규칙]
1) 먼저 야마를 분석해서 아래를 내부 규칙으로 만들고, **모든 문항에 1:1로 적용**하라(출력에는 쓰지 말 것).
   - 지문 톤/문장 길이/표현(자주 쓰는 단어, 종결 어미)
   - 보기 구성 방식(길이, 문장 형태, 자주 쓰는 함정/오답 패턴)
   - 단골 주제와 반복 질문 형태(정의형/비교형/예외형/사례형 등)
   - 숫자/기준/분류 문제를 내는 방식
2) “야마 스타일 비슷하게”가 아니라, **야마의 문항 템플릿을 그대로 재현**하는 것을 최우선 목표로 한다.
3) 교안/교재 내용은 ‘근거’로만 쓰되, 문항의 겉모양(톤/형식/함정/분량)은 **항상 야마 기준**으로 만든다.

[출제 원칙]
1) 범위: 반드시 제공된 자료(야마/교안/교재) 안에서만 출제. 자료에 없는 내용은 만들지 말 것.
2) 반영 우선순위:
   - 1순위: 야마 빈출/반복 파트
   - 2순위: 교안/교재 강조(정의/표/굵게/밑줄/박스/교수 멘트/예외/수치)
   - 3순위: 둘을 연결한 응용(비교, 예외 조건, 혼동 포인트)
3) 근거 불확실하면 그 문항은 버리고 다른 문항으로 대체.

[유형별 규칙]
A) multiple(오지선다)
- choices는 반드시 5개.
- 보기 문장은 모두 문장형이며, **야마에서 흔히 쓰는 보기 길이/톤/패턴을 그대로** 맞춘다.
- 야마가 “복수정답형(옳은 것 모두/옳지 않은 것 모두)”을 쓰는 경향이면 그 비율도 따라라.
  - 복수정답형일 때는 question에 "(복수선택)"을 명시.
  - answer는 정답 보기를 문자열 배열로 제공.

B) short(단답형)
- answer는 채점 가능한 핵심 키워드 1개 문자열.
- 숫자/단위/약어는 야마 채점 스타일에 맞춰 엄격히 작성.

C) essay(서술형)
- answer는 허용 가능한 모범답안 핵심 표현 여러 개 배열.
- explanation에는 채점 기준(핵심 포인트) 포함.

[출력 형식(매우 중요)]
- 출력은 오직 JSON 배열만 출력(머리말/마크다운/코드펜스/설명 금지)
- 스키마:
[
  {
    "type": "multiple" | "short" | "essay",
    "question": "문제 텍스트",
    "choices": ["보기1","보기2","보기3","보기4","보기5"],
    "answer": "정답 문자열" | ["정답후보1","정답후보2",...],
    "explanation": "해설 텍스트"
  }
]
- multiple의 answer:
  - 단일정답이면 문자열 1개(choices 중 하나와 정확히 일치)
  - 복수정답이면 문자열 배열(각 원소가 choices 문장과 정확히 일치)
- short의 answer: 문자열 1개
- essay의 answer: 문자열 배열
- JSON은 반드시 파싱 가능해야 한다.

이제 위 규칙대로 문항을 생성하라.`;

const realExamAnalysisPromptTemplate = `너는 의대 기출문제(야마) 분석 및 시각 자료 데이터 구조화 전문가다.
제공되는 (1) 기출문제/족보 (2) 복기 해설 자료를 분석하여 실제 학습 가능한 형태의 JSON 데이터를 생성하라.

[핵심 목표]
문제와 해설을 정확히 추출하되, 이미지(그림, 사진, 도표)가 포함된 문항은 시각적 요소를 분석해 해설에 반영하고, 중요도와 출처 정보를 구조화하라.
또한 실제 출제된 문제를 중복 여부와 관계없이 가능한 한 전부 복원하라. 선택된 소스에 강의자료/수업자료/강의녹음이 포함된 경우에는, 그 자료가 다루는 범위의 실제 기출문제만 도출하라.

[데이터 처리 규칙]

1. 중요도
* ★★★: 3회 이상 반복 출제
* ★★☆: 2회 출제 또는 교수 강조
* ★☆☆: 1회 출제

2. 출처 및 교수 정보
* explanation 시작에 [출처: {연도/시험명} / 교수: {성함}] 형식을 넣고, 정보가 없으면 미상으로 표기하라.

3. 이미지 문항 분석
* 그림/사진이 포함된 경우, 이미지를 보지 않고도 이해할 수 있을 정도로 시각적 특징을 텍스트로 설명하라.
* 예: "CT 영상에서 우측 간엽에 저음영 종괴가 보임", "화살표가 가리키는 구조물은 정중신경임", "조직 슬라이드에서 고리 모양 세포질이 보임"
* 이를 바탕으로 정답 근거를 연결하라.
* 해설은 핵심 위주로 간결하게 작성하라.

4. 해설 검수
* 복기 내용에 명백한 오류가 있으면 교정하라.
* 교정이 있을 때만 "[원본 복기]: ~~~ / [수정 사항]: ~~~"를 explanation 끝에 추가하라.
* 교정이 없으면 해당 부분은 생략하라.
* 해설이 없으면 핵심 원리를 짧게 보완하라.

5. 누락 보완
* 선지(choices)가 누락된 경우에만 동일 주제 기출이나 교안을 참고해 5지선다를 보완하라.
* 단, 실제 출제 의도와 정답은 바꾸지 마라.

6. 범위 제한
* 강의자료/교안/강의녹음이 없으면 확인 가능한 실제 출제 문제 전체를 출력하라.
* 강의자료/교안/강의녹음이 있으면 그 범위에 해당하는 실제 기출문제만 출력하라.
* 이 자료들은 범위를 판정하는 기준으로 사용하라.
* 범위와 대응되는 실제 기출문제는 포함하고, 범위 밖 문제는 제외하라.
* 예상문제, 변형문제, 신규문제는 생성하지 마라.
* 문제의 선지와 정답은 바꾸지 마라.

7. 범위 판정
* 강의자료/녹음의 제목, 소단원, 핵심 개념, 교수 설명, 예시 구조를 기준으로 범위를 정하라.
* 표현이 직접 일치하지 않아도 동일 개념·동일 단원·동일 학습목표면 포함하라.
* 비슷한 용어만 있고 실제로 다른 단원이면 제외하라.
* 애매한 경우 판단 근거를 explanation 또는 meta에 짧게 반영하라.

8. 전체 문항 복원
* 자료 전체를 검토하여 범위에 해당하는 실제 출제 문제를 가능한 한 모두 추출하라.
* 중복처럼 보여도 삭제·통합·생략하지 말고 모두 별도 문항으로 유지하라.
* 같은 질문과 정답이라도 다른 연도, 다른 시험, 다른 복기 출처에서 실제 출제되었다면 각각 별도 문항으로 반드시 유지하라.
* 문장이나 정답이 동일해 보여도 출처가 다르면 서로 다른 문항으로 간주하라.
* 출력 개수를 임의로 제한하지 말고, 확인 가능한 실제 기출문항을 JSON 배열에 넣어라.
* 한 번에 너무 길면 여러 번에 나누어 출력하되, 범위에 해당하는 전체 문항이 모두 나올 때까지 계속 출력하라.
* 절대로 자체적으로 중복 제거(deduplication)하지 마라.
* 예를 들어 자료상 해당 범위의 실제 기출문제가 중복 포함 52개라면, 52개 전부 출력하라.

9. 정답 표기 및 검증
* 객관식(type = "multiple")의 answer는 정답 번호만 출력하라. 예: "answer": 3
* 복수정답이면 배열로 출력하라. 예: "answer": [2,5]
* 단답형/서술형은 문자열 또는 배열을 사용해도 된다.
* answer는 반드시 choices에 대응되는 번호여야 한다.
* 확정이 안 되면 비워두지 말고 문제 파일과 해설 파일을 다시 대조해 확정하라.

10. 출력 형식
* 출력은 JSON 배열만 반환하고, 코드 펜스는 사용하지 마라.
* 배열 뒤에 설명문은 붙이지 마라.
* 배열 마지막에는 진행 상태를 담은 _meta 객체 1개를 추가하라.
* _meta에는 deduplication_applied: false 를 반드시 포함하라.

[출력 JSON 스키마]
[
  {
    "importance": "★★★",
    "type": "multiple" | "short" | "essay",
    "question": "문제 내용 (그림이 있는 경우 '다음 영상/사진에 대한 설명으로~' 포함)",
    "choices": ["선지1", "선지2", "선지3", "선지4", "선지5"],
    "answer": 3,
    "explanation": "[출처: {연도/시험명} / 교수: {성함}] [중요도 근거: 3회 이상 반복 출제 / 2회 출제 / 교수 강조 / 1회 출제] (시각 자료 분석) (핵심 해설) [원본 복기]: ~ / [수정 사항]: ~"
  },
  {
    "_meta": {
      "total_target_questions": 52,
      "current_batch_extracted": 15,
      "cumulative_extracted": 15,
      "remaining_questions": 37,
      "next_start_index": 16,
      "deduplication_applied": false,
      "progress_info": "전체 52문제 중 15문제 출력 완료. 중복 제거 없이 원문 기준으로 유지. '계속'이라고 하면 이어서 출력."
    }
  }
]

[추가 규칙]
* choices는 객관식에만 넣고, 단답형/서술형은 필요 시 생략 가능하다.
* explanation은 간결하게 쓰되 정답 근거는 드러나야 한다.
* [원본 복기] / [수정 사항]은 교정이 있을 때만 포함하라.
* 출처가 다르면 동일 문제처럼 보여도 별도 문항으로 유지하라.
* 동일 출처 안에서조차 문제 번호가 다르면 별도 문항으로 유지하라.
* 순서 - 최신 기출일수록, 중요도가 높을수록 앞 순서에 오도록하여 출력하라

[실행 명령]
지금부터 자료를 분석해 위 스키마로 JSON을 생성하라.
강의자료/녹음이 포함된 경우에는 그 범위의 실제 기출문제만 추출하고 범위 밖 문제는 제외하라.
한 번에 전부 출력하지 못하면 배열 마지막에 _meta를 넣고, total_target_questions, current_batch_extracted, cumulative_extracted, remaining_questions, next_start_index, progress_info, deduplication_applied 를 채워라.
사용자가 "계속"이라고 말하면 직전 _meta.next_start_index 다음 문제부터 이어서 출력하라.

중요: 자료 전체를 끝까지 검토한 뒤, 범위 내 실제 기출문항을 중복 포함하여 빠뜨리지 말고 배열에 포함하라.
출력 전에는 choices와 answer의 정합성을 확인하라.
문제(question)·선지(choices)·정답(answer)은 문제 파일 원문 기준으로, 해설(explanation)은 해설/복기 파일 기준으로 작성하라.
문제 원문과 선지는 바꾸지 마라.
자체적인 중복 제거는 하지 마라.`;

jsonExample.textContent = JSON.stringify(sampleJson, null, 2);
promptTemplate.textContent = medicalPromptTemplate;
if (realExamPromptTemplateEl) {
  realExamPromptTemplateEl.textContent = realExamAnalysisPromptTemplate;
}

function showScreen(screen) {
  [setupScreen, imageSetupScreen, examScreen, resultScreen]
    .filter(Boolean)
    .forEach((el) => el.classList.remove('active'));
  screen.classList.add('active');
}


function setModeSwitch(type) {
  state.activeQuizType = type;
  openJsonQuizBtn?.classList.toggle('active', type === 'json');
  openJsonQuizBtn?.classList.toggle('secondary', type === 'json');
  openJsonQuizBtn?.classList.toggle('ghost', type !== 'json');
  openImageQuizBtn?.classList.toggle('active', type === 'image');
  openImageQuizBtn?.classList.toggle('secondary', type === 'image');
  openImageQuizBtn?.classList.toggle('ghost', type !== 'image');
}

function normalizeAnswerToken(token) {
  return token.replace(/_\d+$/i, '').trim();
}

function parseFilenameFromUrl(urlText) {
  const trimmed = urlText.trim();
  if (!trimmed) {
    return '';
  }

  const clean = trimmed.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const nameWithExt = decoded.split('/').pop() || '';
  return nameWithExt.replace(/\.[^.]+$/, '').trim();
}

async function loadDefaultImageQuizQuestions() {
  const response = await fetch(STORAGE_LIST_ENDPOINT);
  if (!response.ok) {
    throw new Error(`이미지 목록을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const urls = items
    .map((item) => String(item?.name || '').trim())
    .filter((name) => name.toLowerCase().endsWith('.webp'))
    .map(buildStorageMediaUrl);

  if (urls.length === 0) {
    throw new Error('기본 이미지 목록에서 .webp 파일을 찾지 못했습니다.');
  }

  return urls.map((url, index) => {
    const fileName = parseFilenameFromUrl(url);
    if (!fileName) {
      throw new Error(`${index + 1}번째 URL에서 파일명을 읽을 수 없습니다.`);
    }

    const isMultiName = fileName.startsWith('!');
    const normalizedAnswerName = isMultiName ? fileName.slice(1) : fileName;
    const splitAnswers = normalizedAnswerName
      .split(',')
      .map((part) => normalizeAnswerToken(part.trim()))
      .filter(Boolean);

    if (splitAnswers.length === 0) {
      throw new Error(`${index + 1}번째 이미지의 정답 파일명이 비어 있습니다.`);
    }

    const guidance = isMultiName
      ? '복수 정답입니다. 쉼표(,)로 구분해 입력하세요. 순서/대소문자는 상관없습니다.'
      : '대소문자는 구분하지 않습니다.';

    return {
      type: 'short',
      question: '',
      choices: [],
      acceptedAnswers: splitAnswers,
      acceptedAnswerSet: isMultiName,
      imageUrl: url,
      explanation: `정답: ${splitAnswers.join(', ')} (${guidance})`,
    };
  });
}

function normalizeCsvAnswerSet(value) {
  return String(value)
    .split(',')
    .map((part) => normalize(part))
    .filter(Boolean)
    .sort();
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toArray(value) {
  return Array.isArray(value) ? value : [value];
}

function getSavedSets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSavedSets(sets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}


function getRemoteSetsEndpoint() {
  return `${REMOTE_BASE_URL}/quizSets.json`;
}

function reportSyncError(error, actionLabel) {
  setupError.textContent = `${actionLabel} 실패: ${error.message}`;
}

async function pushSetsToRemote() {
  const endpoint = getRemoteSetsEndpoint();
  const sets = getSavedSets();

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sets),
  });

  if (!response.ok) {
    throw new Error(`업로드 실패 (HTTP ${response.status})`);
  }

  return sets.length;
}

async function pullSetsFromRemote() {
  const endpoint = getRemoteSetsEndpoint();
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`불러오기 실패 (HTTP ${response.status})`);
  }

  const payload = await response.json();
  if (payload === null) {
    setSavedSets([]);
    renderSavedSets();
    return 0;
  }

  if (!Array.isArray(payload)) {
    throw new Error('서버 데이터 형식이 올바르지 않습니다.');
  }

  const sanitized = payload
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      createdAt: String(item.createdAt || new Date().toISOString()),
      questionCount: Number(item.questionCount || 0),
      title: String(item.title || '제목 없는 세트'),
      rawJson: String(item.rawJson || '').trim(),
    }))
    .filter((item) => item.rawJson)
    .slice(0, 50);

  setSavedSets(sanitized);
  renderSavedSets();
  return sanitized.length;
}

async function syncLocalSetsToRemote(actionLabel = '서버 저장') {
  try {
    const count = await pushSetsToRemote();
    setupError.textContent = `${actionLabel} 완료: 서버에 ${count}개 세트를 반영했어요.`;
  } catch (error) {
    reportSyncError(error, actionLabel);
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderSavedSets() {
  const sets = getSavedSets();
  savedSetList.innerHTML = '';

  if (sets.length === 0) {
    savedSetList.innerHTML = '<p class="empty-saved">저장된 세트가 아직 없어요.</p>';
    return;
  }

  sets.forEach((setItem) => {
    const item = document.createElement('article');
    item.className = 'saved-set-item';
    item.innerHTML = `
      <div class="saved-meta">
        <strong>${escapeHtml(setItem.title || `문제 ${setItem.questionCount}개 세트`)}</strong>
        <span>생성일: ${escapeHtml(formatDate(setItem.createdAt))}</span>
        <span>문제 수: ${escapeHtml(setItem.questionCount)}</span>
      </div>
      <div class="saved-actions">
        <button type="button" class="secondary load-set-btn" data-set-id="${escapeHtml(setItem.id)}">불러오기</button>
        <button type="button" class="ghost rename-set-btn" data-set-id="${escapeHtml(setItem.id)}">제목 변경</button>
        <button type="button" class="ghost delete-set-btn" data-set-id="${escapeHtml(setItem.id)}">삭제</button>
      </div>
    `;

    savedSetList.appendChild(item);
  });
}

function getDefaultSetTitle(questionCount) {
  return `문제 ${questionCount}개 세트`;
}

function saveQuestionSet(rawJson, questionCount, titleInput = '') {
  const sets = getSavedSets();
  const normalizedRaw = rawJson.trim();
  const existing = sets.find((setItem) => setItem.rawJson.trim() === normalizedRaw);

  if (existing) {
    existing.createdAt = new Date().toISOString();
    existing.questionCount = questionCount;
    existing.title = titleInput.trim() || existing.title || getDefaultSetTitle(questionCount);
    setSavedSets(sets);
    renderSavedSets();
    void syncLocalSetsToRemote('중복 세트 갱신');
    return;
  }

  const newSet = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    questionCount,
    title: titleInput.trim() || getDefaultSetTitle(questionCount),
    rawJson: normalizedRaw,
  };

  setSavedSets([newSet, ...sets].slice(0, 50));
  renderSavedSets();
  void syncLocalSetsToRemote('새 세트 저장');
}

function extractJsonArrays(rawText) {
  let inString = false;
  let escapeNext = false;
  let depth = 0;
  let start = -1;
  const arrays = [];

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '[') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }

    if (char === ']') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          arrays.push(rawText.slice(start, index + 1));
          start = -1;
        }
      }
    }
  }

  return arrays;
}

function sanitizeJsonInput(rawText) {
  const withoutFence = rawText
    .replace(/```(?:json)?/gi, '')
    .trim();
  const extractedArrays = extractJsonArrays(withoutFence);
  return {
    combinedJsonText:
      extractedArrays.length > 0
        ? `[${extractedArrays.map((chunk) => chunk.trim().slice(1, -1)).join(',')}]`
        : withoutFence,
    extractedArrayCount: extractedArrays.length,
  };
}

function sanitizeQuestionItem(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  if (Array.isArray(item)) {
    return item.map((entry) => sanitizeQuestionItem(entry));
  }

  return Object.fromEntries(
    Object.entries(item)
      .filter(([key]) => !String(key).trim().toLowerCase().includes('_meta'))
      .map(([key, value]) => [key, sanitizeQuestionItem(value)]),
  );
}

function hasQuestionPayload(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false;
  }

  return Object.keys(item).length > 0;
}

function sanitizeExplanationText(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '해설이 제공되지 않았습니다.';
  }

  return text
    .replace(/(?:^|\n)\s*내\s*정답\s*[:：].*(?=\n|$)/gi, '')
    .replace(/내\s*정답\s*[:：]\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim() || '해설이 제공되지 않았습니다.';
}

function parseMultipleAnswerIndexes(answer, choices, questionIndex) {
  const rawAnswers = toArray(answer);
  if (rawAnswers.length === 0) {
    throw new Error(
      `${questionIndex + 1}번 객관식 문제의 answer가 비어 있습니다.`,
    );
  }

  const mappedIndexes = rawAnswers.map((ans) => {
    if (
      typeof ans === 'number' &&
      Number.isInteger(ans) &&
      ans >= 1 &&
      ans <= choices.length
    ) {
      return ans - 1;
    }

    const asText = String(ans).trim();
    if (!asText) {
      throw new Error(
        `${questionIndex + 1}번 객관식 문제의 answer에 빈 값이 있습니다.`,
      );
    }

    if (/^\d+$/.test(asText)) {
      const numeric = Number(asText);
      if (numeric >= 1 && numeric <= choices.length) {
        return numeric - 1;
      }
    }

    const byTextIndex = choices.findIndex(
      (choice) => normalize(choice) === normalize(asText),
    );
    if (byTextIndex === -1) {
      throw new Error(
        `${
          questionIndex + 1
        }번 객관식 문제의 answer("${asText}")가 choices에 존재하지 않습니다.`,
      );
    }

    return byTextIndex;
  });

  return [...new Set(mappedIndexes)].sort((a, b) => a - b);
}

function isUnavailableAnswerMarker(value) {
  if (value === undefined || value === null) {
    return false;
  }
  const compact = normalize(String(value)).replace(/\s+/g, '');
  return compact.includes('정답확인불가') || compact.includes('자료누락');
}

function formatMultipleAnswer(indexes, choices, { useChoiceText = false } = {}) {
  if (useChoiceText) {
    return indexes.map((idx) => String(choices[idx] ?? '')).join(' / ');
  }
  return indexes.map((idx) => `${idx + 1}번`).join(', ');
}

function formatTextAnswer(answers) {
  return answers.map((answer) => String(answer)).join(' / ');
}

function getCorrectAnswerDisplay(question, { useChoiceText = false } = {}) {
  if (question.isUnverifiableAnswer) {
    return question.unverifiableAnswerText || '정답 확인 불가';
  }

  if (question.type === 'multiple') {
    return formatMultipleAnswer(question.correctIndexes, question.choices, {
      useChoiceText,
    });
  }
  return formatTextAnswer(question.acceptedAnswers);
}

function buildFeedbackHtml({
  isCorrect,
  userAnswerDisplay,
  correctAnswerDisplay,
  explanation,
  includeUserAnswer = true,
}) {
  const answerTitle =
    isCorrect === null
      ? '정답 확인 불가 문항입니다.'
      : isCorrect
        ? '정답입니다!'
        : '오답입니다.';
  return `
    <div class="feedback-title"><strong>${answerTitle}</strong></div>
    ${includeUserAnswer ? `<div class="feedback-row"><strong>내 답:</strong> ${escapeHtml(userAnswerDisplay)}</div>` : ''}
    <div class="feedback-row"><strong>정답:</strong> ${escapeHtml(correctAnswerDisplay)}</div>
    <div class="feedback-row feedback-explanation"><strong>해설:</strong> ${escapeHtml(explanation)}</div>
  `;
}

function parseQuestions(rawText) {
  const { combinedJsonText, extractedArrayCount } = sanitizeJsonInput(rawText);
  const parsed = JSON.parse(combinedJsonText);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON은 비어있지 않은 배열이어야 합니다.');
  }

  const mergedItems = parsed
    .map((item) => sanitizeQuestionItem(item))
    .filter((item) => hasQuestionPayload(item));

  if (mergedItems.length === 0) {
    throw new Error('메타 정보만 있는 JSON입니다. 문제 데이터를 확인해주세요.');
  }

  const questions = mergedItems.map((item, index) => {
    if (!['multiple', 'short', 'essay'].includes(item.type)) {
      throw new Error(
        `${index + 1}번 문제의 type은 multiple, short, essay 중 하나여야 합니다.`,
      );
    }
    if (!item.question || item.answer === undefined || item.answer === null) {
      throw new Error(`${index + 1}번 문제에 question 또는 answer가 없습니다.`);
    }

    if (item.type === 'multiple') {
      if (!Array.isArray(item.choices) || item.choices.length < 2) {
        throw new Error(
          `${index + 1}번 객관식 문제는 choices 배열(2개 이상)이 필요합니다.`,
        );
      }

      const answerCandidates = toArray(item.answer);
      const hasUnavailableAnswer =
        answerCandidates.length === 1 &&
        isUnavailableAnswerMarker(answerCandidates[0]);
      const correctIndexes = hasUnavailableAnswer
        ? []
        : parseMultipleAnswerIndexes(item.answer, item.choices, index);

      if (!hasUnavailableAnswer && correctIndexes.length === 0) {
        throw new Error(
          `${index + 1}번 객관식 문제의 answer가 비어 있습니다.`,
        );
      }

      return {
        type: item.type,
        question: item.question,
        choices: item.choices,
        correctIndexes,
        isMultiAnswer: correctIndexes.length > 1,
        isUnverifiableAnswer: hasUnavailableAnswer,
        unverifiableAnswerText: hasUnavailableAnswer
          ? String(answerCandidates[0]).trim() || '정답 확인 불가'
          : '',
        explanation: sanitizeExplanationText(item.explanation),
        importance: item.importance ? String(item.importance).trim() : '',
      };
    }

    const acceptedAnswers = toArray(item.answer)
      .map((answer) => String(answer))
      .filter((answer) => answer.trim());
    if (acceptedAnswers.length === 0) {
      const label = item.type === 'essay' ? '서술형' : '주관식';
      throw new Error(`${index + 1}번 ${label} 문제의 answer가 비어 있습니다.`);
    }

    return {
      type: item.type,
      question: item.question,
      choices: [],
      acceptedAnswers,
      explanation: sanitizeExplanationText(item.explanation),
      importance: item.importance ? String(item.importance).trim() : '',
    };
  });

  return {
    questions,
    sanitizedJsonText: combinedJsonText,
    extractedArrayCount,
  };
}


function formatImportanceBadge(question) {
  if (!question?.importance) {
    return '';
  }
  const raw = String(question.importance).trim();
  if (!raw) {
    return '';
  }
  return ` ${raw}`;
}

function getCurrentQuestion() {
  return state.quizSet[state.currentIndex];
}

function getExamHash(index = state.currentIndex) {
  return `#/exam/${index + 1}`;
}

function setRoute(hash, { replace = false } = {}) {
  if (window.location.hash === hash) {
    return;
  }

  if (replace) {
    history.replaceState(null, '', hash);
    return;
  }

  window.location.hash = hash;
}

function openSetup({ replace = false } = {}) {
  state.currentScreen = 'setup';
  setModeSwitch('json');
  showScreen(setupScreen);
  setRoute('#/setup', { replace });
}

function openImageSetup({ replace = false } = {}) {
  if (!imageSetupScreen) {
    return;
  }

  state.currentScreen = 'image-setup';
  setModeSwitch('image');
  showScreen(imageSetupScreen);
  setRoute('#/image-setup', { replace });
}

function openExam({ replace = false } = {}) {
  if (state.quizSet.length === 0) {
    openSetup({ replace: true });
    return;
  }

  state.currentScreen = 'exam';
  showScreen(examScreen);
  renderQuestion();
  setRoute(getExamHash(), { replace });
}

function focusExamActions() {
  examActions?.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function openResult({ replace = false } = {}) {
  if (state.answers.length === 0 || state.answers.some((answer) => !answer)) {
    openSetup({ replace: true });
    return;
  }

  state.currentScreen = 'result';
  showScreen(resultScreen);
  renderResultContent();
  setRoute('#/result', { replace });
}

function renderQuestion() {
  const q = getCurrentQuestion();
  progressText.textContent = `${state.currentIndex + 1} / ${state.quizSet.length}`;
  modeBadge.textContent =
    state.reviewMode === 'immediate' ? '즉시 채점 모드' : '일괄 채점 모드';

  const isImageQuizQuestion = Boolean(q.imageUrl);
  const typeLabel =
    q.type === 'multiple' ? '객관식' : q.type === 'short' ? '주관식' : '서술형';
  const importanceBadge = formatImportanceBadge(q);
  questionTitle.textContent = isImageQuizQuestion
    ? `이미지 ${state.currentIndex + 1}${importanceBadge}`
    : `문제 ${state.currentIndex + 1} (${typeLabel})${importanceBadge}`;
  questionText.textContent = isImageQuizQuestion ? '' : q.question;

  if (q.imageUrl) {
    questionMedia.classList.remove('hidden');
    const multiGuide = q.acceptedAnswerSet
      ? '<p class="question-media-guide">복수 정답: 쉼표(,)로 구분해서 입력하세요. 순서/대소문자 무관</p>'
      : '<p class="question-media-guide">대소문자 구분 없이 입력</p>';
    questionMedia.innerHTML = `<img src="${escapeHtml(q.imageUrl)}" alt="퀴즈 이미지 ${state.currentIndex + 1}" class="question-image" />${multiGuide}`;
  } else {
    questionMedia.classList.add('hidden');
    questionMedia.innerHTML = '';
  }

  feedbackBox.className = 'feedback hidden';
  feedbackBox.textContent = '';

  submitBtn.disabled = false;
  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');
  finishBtn.classList.add('hidden');

  if (q.type === 'multiple') {
    const inputType = q.isMultiAnswer ? 'checkbox' : 'radio';
    answerArea.innerHTML = q.choices
      .map(
        (choice, idx) => `
        <label class="choice" data-choice-index="${idx}">
          <input type="${inputType}" name="choice" value="${idx}" />
          ${idx + 1}. ${escapeHtml(choice)}
        </label>
      `,
      )
      .join('');
  } else if (q.type === 'short') {
    const shortPlaceholder = q.acceptedAnswerSet
      ? '정답들을 쉼표(,)로 구분해서 입력하세요'
      : '정답을 입력하세요';
    answerArea.innerHTML =
      `<input class="short-input" type="text" id="text-answer" placeholder="${shortPlaceholder}" />`;
  } else {
    answerArea.innerHTML =
      '<textarea class="essay-input" id="text-answer" placeholder="서술형 답안을 입력하세요"></textarea>';
  }

  const existing = state.answers[state.currentIndex];
  if (existing) {
    applySavedAnswer(existing, q);
  }
}

function paintChoiceResult(question, userAnswer) {
  const labels = Array.from(answerArea.querySelectorAll('.choice'));

  labels.forEach((label) => {
    const choiceIndex = Number(label.dataset.choiceIndex);
    const isCorrectChoice = question.correctIndexes.includes(choiceIndex);
    const isSelectedByUser = question.isMultiAnswer
      ? Array.isArray(userAnswer) && userAnswer.includes(choiceIndex)
      : userAnswer === choiceIndex;

    label.classList.remove('correct-choice', 'wrong-choice');
    if (isCorrectChoice) {
      label.classList.add('correct-choice');
    } else if (isSelectedByUser) {
      label.classList.add('wrong-choice');
    }

    const input = label.querySelector('input');
    input.disabled = true;
  });
}

function paintTextResult(isCorrect) {
  const input = document.getElementById('text-answer');
  if (!input) {
    return;
  }

  input.classList.remove('text-correct', 'text-wrong');
  input.classList.add(isCorrect ? 'text-correct' : 'text-wrong');
  input.disabled = true;
}

function applySavedAnswer(answerRecord, question) {
  if (question.type === 'multiple') {
    const selectedIndexes = question.isMultiAnswer
      ? answerRecord.rawUserAnswer
      : [answerRecord.rawUserAnswer];

    selectedIndexes.forEach((idx) => {
      const input = answerArea.querySelector(`input[value="${idx}"]`);
      if (input) {
        input.checked = true;
      }
    });

    if (state.reviewMode === 'immediate') {
      paintChoiceResult(question, answerRecord.rawUserAnswer);
      feedbackBox.className = `feedback ${
        answerRecord.isCorrect ? 'correct' : 'incorrect'
      }`;
      feedbackBox.innerHTML = buildFeedbackHtml({
        isCorrect: answerRecord.isCorrect,
        userAnswerDisplay: answerRecord.userAnswerDisplay,
        correctAnswerDisplay: answerRecord.correctAnswerDisplay,
        explanation: question.explanation,
        includeUserAnswer: false,
      });
    }
  } else {
    const input = document.getElementById('text-answer');
    if (input) {
      input.value = answerRecord.rawUserAnswer;
      input.disabled = true;
    }

    if (state.reviewMode === 'immediate') {
      paintTextResult(answerRecord.isCorrect);
      feedbackBox.className = `feedback ${
        answerRecord.isCorrect ? 'correct' : 'incorrect'
      }`;
      feedbackBox.innerHTML = buildFeedbackHtml({
        isCorrect: answerRecord.isCorrect,
        userAnswerDisplay: answerRecord.userAnswerDisplay,
        correctAnswerDisplay: answerRecord.correctAnswerDisplay,
        explanation: question.explanation,
        includeUserAnswer: false,
      });
    }
  }

  submitBtn.classList.add('hidden');
  const isLast = state.currentIndex === state.quizSet.length - 1;
  if (isLast) {
    finishBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }
}

function collectUserAnswer() {
  const q = getCurrentQuestion();
  if (q.type === 'multiple') {
    if (q.isMultiAnswer) {
      return Array.from(
        document.querySelectorAll('input[name="choice"]:checked'),
      ).map((input) => Number(input.value));
    }

    const selected = document.querySelector('input[name="choice"]:checked');
    return selected ? Number(selected.value) : null;
  }

  const input = document.getElementById('text-answer');
  return input ? input.value : '';
}

function evaluateAnswer(userAnswer, question) {
  if (question.isUnverifiableAnswer) {
    return null;
  }

  if (question.type === 'multiple') {
    if (question.isMultiAnswer) {
      if (
        !Array.isArray(userAnswer) ||
        userAnswer.length !== question.correctIndexes.length
      ) {
        return false;
      }
      const sortedUser = [...userAnswer].sort((a, b) => a - b);
      return sortedUser.every(
        (value, idx) => value === question.correctIndexes[idx],
      );
    }

    return userAnswer === question.correctIndexes[0];
  }

  if (question.acceptedAnswerSet) {
    const userSet = normalizeCsvAnswerSet(userAnswer);
    const answerSet = question.acceptedAnswers.map((answer) => normalize(answer)).sort();
    if (userSet.length !== answerSet.length) {
      return false;
    }
    return userSet.every((value, idx) => value === answerSet[idx]);
  }

  return question.acceptedAnswers.some(
    (answer) => normalize(userAnswer) === normalize(answer),
  );
}

function getUserAnswerDisplay(userAnswer, question) {
  if (question.type === 'multiple') {
    if (question.isMultiAnswer) {
      if (!Array.isArray(userAnswer) || userAnswer.length === 0) {
        return '선택 없음';
      }
      return formatMultipleAnswer(
        [...userAnswer].sort((a, b) => a - b),
        question.choices,
        {
          useChoiceText: true,
        },
      );
    }

    if (typeof userAnswer !== 'number') {
      return '선택 없음';
    }
    return question.choices[userAnswer] || '선택 없음';
  }

  return userAnswer;
}

function handleSubmit() {
  const question = getCurrentQuestion();
  const userAnswer = collectUserAnswer();

  const isEmptyAnswer =
    question.type === 'multiple'
      ? question.isMultiAnswer
        ? userAnswer.length === 0
        : userAnswer === null
      : !userAnswer.trim();

  if (isEmptyAnswer) {
    feedbackBox.className = 'feedback incorrect';
    feedbackBox.textContent = '답안을 입력하거나 선택해주세요.';
    return;
  }

  const isCorrect = evaluateAnswer(userAnswer, question);
  const correctAnswerDisplay = getCorrectAnswerDisplay(question, {
    useChoiceText: question.type === 'multiple',
  });
  const userAnswerDisplay = getUserAnswerDisplay(userAnswer, question);

  state.answers[state.currentIndex] = {
    rawUserAnswer: Array.isArray(userAnswer) ? [...userAnswer] : userAnswer,
    userAnswerDisplay,
    isCorrect,
    correctAnswerDisplay,
    explanation: question.explanation,
    question: question.question,
  };

  if (state.reviewMode === 'immediate') {
    feedbackBox.className =
      isCorrect === null
        ? 'feedback'
        : `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackBox.innerHTML = buildFeedbackHtml({
      isCorrect,
      userAnswerDisplay,
      correctAnswerDisplay,
      explanation: question.explanation,
    });

    if (question.type === 'multiple' && isCorrect !== null) {
      paintChoiceResult(question, userAnswer);
    } else if (isCorrect !== null) {
      paintTextResult(isCorrect);
    }
  }

  submitBtn.classList.add('hidden');

  if (state.currentIndex === state.quizSet.length - 1) {
    finishBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }

  focusExamActions();
}

function goNext() {
  state.currentIndex += 1;
  openExam();
}

function renderResultContent() {
  const total = state.answers.length;
  const scorableAnswers = state.answers.filter((a) => a.isCorrect !== null);
  const scorableTotal = scorableAnswers.length;
  const correct = scorableAnswers.filter((a) => a.isCorrect).length;
  const wrong = scorableTotal - correct;
  const unverifiableCount = total - scorableTotal;
  const score =
    scorableTotal === 0 ? 0 : Math.round((correct / scorableTotal) * 100);

  resultSummary.innerHTML = `
    <strong>점수:</strong> ${score}점 (${correct} / ${scorableTotal} 정답)<br/>
    <strong>오답:</strong> ${wrong}개${
      unverifiableCount > 0
        ? `<br/><strong>정답 확인 불가:</strong> ${unverifiableCount}개`
        : ''
    }
  `;

  resultList.innerHTML = '';
  state.answers.forEach((item, idx) => {
    const resultItem = document.createElement('div');
    resultItem.className = `result-item ${item.isCorrect === false ? 'incorrect' : ''}`;

    const explanationText =
      state.reviewMode === 'end' || item.isCorrect !== true
        ? `<div><strong>정답:</strong> ${escapeHtml(
            item.correctAnswerDisplay,
          )}</div><div><strong>해설:</strong> ${escapeHtml(
            item.explanation,
          )}</div>`
        : '';

    resultItem.innerHTML = `
      <div><strong>${idx + 1}. ${escapeHtml(item.question)}${escapeHtml(formatImportanceBadge(state.quizSet[idx]))}</strong></div>
      <div>내 답: ${escapeHtml(item.userAnswerDisplay)}</div>
      <div>${item.isCorrect === null ? '⚪ 정답 확인 불가' : item.isCorrect ? '✅ 정답' : '❌ 오답'}</div>
      ${explanationText}
    `;

    resultList.appendChild(resultItem);
  });

  if (wrong > 0) {
    motivation.textContent =
      '지금이 성장 타이밍! 틀린 문제를 바로 다시 잡으면 실력이 폭발적으로 올라갑니다. 한 번 더 달려서 점수 갈아치워봐요! 🔥';
  } else {
    motivation.textContent =
      '와우, 전부 정답! 이 집중력 그대로 다음 세트도 압도해봐요. 오늘 폼 미쳤다! ⚡';
  }

  const retryWrongBtn = document.getElementById('retry-wrong-btn');
  retryWrongBtn.classList.toggle('hidden', wrong === 0);
}

function startQuiz(questions) {
  state.quizSet = questions;
  state.answers = new Array(questions.length);
  state.currentIndex = 0;
  openExam();
}

function applyRouteFromHash() {
  const hash = window.location.hash || '#/setup';
  const examMatch = hash.match(/^#\/exam\/(\d+)$/);

  if (hash === '#/setup') {
    openSetup({ replace: true });
    return;
  }

  if (hash === '#/image-setup') {
    if (imageSetupScreen) {
      openImageSetup({ replace: true });
      return;
    }
  }

  if (examMatch) {
    if (state.quizSet.length === 0) {
      openSetup({ replace: true });
      return;
    }

    const requested = Number(examMatch[1]) - 1;
    if (!Number.isInteger(requested)) {
      openExam({ replace: true });
      return;
    }

    state.currentIndex = Math.max(0, Math.min(requested, state.quizSet.length - 1));
    openExam({ replace: true });
    return;
  }

  if (hash === '#/result') {
    openResult({ replace: true });
    return;
  }

  openSetup({ replace: true });
}

function applySetTitlePlaceholder(questionCount) {
  const defaultTitle = getDefaultSetTitle(questionCount);
  if (saveSetModalInput) {
    saveSetModalInput.placeholder = defaultTitle;
  }
  return defaultTitle;
}

function parseAndNormalizeInput() {
  const { questions, sanitizedJsonText } = parseQuestions(jsonInput.value);
  jsonInput.value = sanitizedJsonText;
  applySetTitlePlaceholder(questions.length);
  return { questions, sanitizedJsonText };
}

function openSaveSetModal() {
  if (!saveSetModal || typeof saveSetModal.showModal !== 'function') {
    return false;
  }

  saveSetModal.showModal();
  requestAnimationFrame(() => {
    saveSetModalInput?.focus();
  });
  return true;
}

function closeSaveSetModal() {
  saveSetModal?.close();
  if (saveSetModalInput) {
    saveSetModalInput.value = '';
  }
  state.pendingSavePayload = null;
}

saveSetBtn?.addEventListener('click', () => {
  setupError.textContent = '';

  try {
    const { questions, sanitizedJsonText } = parseAndNormalizeInput();
    state.pendingSavePayload = {
      questions,
      sanitizedJsonText,
      questionCount: questions.length,
    };

    const opened = openSaveSetModal();
    if (!opened) {
      saveQuestionSet(sanitizedJsonText, questions.length);
      setupError.textContent = '문제 세트를 저장했어요.';
      state.pendingSavePayload = null;
    }
  } catch (error) {
    setupError.textContent = `문제 세트 저장 실패: ${error.message}`;
  }
});

openJsonQuizBtn?.addEventListener('click', () => {
  openSetup();
});

openImageQuizBtn?.addEventListener('click', () => {
  openImageSetup();
});

document.getElementById('start-btn').addEventListener('click', () => {
  setupError.textContent = '';

  try {
    const { questions } = parseAndNormalizeInput();
    state.originalSet = questions;
    const mode = document.querySelector('input[name="review-mode"]:checked').value;
    state.reviewMode = mode;
    state.round = 1;
    startQuiz([...state.originalSet]);
  } catch (error) {
    setupError.textContent = `문제 세트 로드 실패: ${error.message}`;
  }
});


startImageQuizBtn?.addEventListener('click', async () => {
  imageSetupError.textContent = '';

  try {
    const questions = await loadDefaultImageQuizQuestions();
    state.originalSet = questions;
    const mode = document.querySelector('input[name="review-mode-image"]:checked').value;
    state.reviewMode = mode;
    state.round = 1;
    startQuiz([...state.originalSet]);
  } catch (error) {
    imageSetupError.textContent = `이미지 퀴즈 로드 실패: ${error.message}`;
  }
});

submitBtn.addEventListener('click', handleSubmit);
nextBtn.addEventListener('click', goNext);
finishBtn.addEventListener('click', () => {
  openResult();
});

document.getElementById('retry-all-btn').addEventListener('click', () => {
  state.round += 1;
  startQuiz([...state.originalSet]);
});

document.getElementById('retry-wrong-btn').addEventListener('click', () => {
  const wrongIndexes = state.answers
    .map((answer, idx) => ({ answer, idx }))
    .filter((x) => !x.answer.isCorrect)
    .map((x) => x.idx);

  const wrongQuestions = wrongIndexes.map((idx) => state.quizSet[idx]);
  if (wrongQuestions.length === 0) {
    return;
  }

  state.round += 1;
  startQuiz(wrongQuestions);
});

document.getElementById('go-home-btn').addEventListener('click', () => {
  openSetup();
});

copyPromptBtn?.addEventListener('click', async () => {
  copyFeedback.textContent = '';
  try {
    await navigator.clipboard.writeText(medicalPromptTemplate);
    copyFeedback.textContent = '프롬프트가 복사되었어요.';
  } catch {
    copyFeedback.textContent = '복사에 실패했어요. 직접 선택해서 복사해주세요.';
  }
});

copyRealExamPromptBtn?.addEventListener('click', async () => {
  if (!realExamCopyFeedback) {
    return;
  }

  realExamCopyFeedback.textContent = '';
  try {
    await navigator.clipboard.writeText(realExamAnalysisPromptTemplate);
    realExamCopyFeedback.textContent = '프롬프트가 복사되었어요.';
  } catch {
    realExamCopyFeedback.textContent = '복사에 실패했어요. 직접 선택해서 복사해주세요.';
  }
});

copyJsonBtn?.addEventListener('click', async () => {
  jsonCopyFeedback.textContent = '';
  try {
    await navigator.clipboard.writeText(JSON.stringify(sampleJson, null, 2));
    jsonCopyFeedback.textContent = '예시 JSON이 복사되었어요.';
  } catch {
    jsonCopyFeedback.textContent = '복사에 실패했어요. 직접 선택해서 복사해주세요.';
  }
});

savedSetList?.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  const setId = button.dataset.setId;
  const sets = getSavedSets();
  const selected = sets.find((setItem) => setItem.id === setId);
  if (!selected) {
    return;
  }

  if (button.classList.contains('load-set-btn')) {
    jsonInput.value = selected.rawJson;
    setupError.textContent = '저장된 세트를 불러왔어요. 바로 문제 시작을 누르면 됩니다.';
    jsonInput.focus();
    jsonInput.setSelectionRange(0, 0);
    return;
  }

  if (button.classList.contains('rename-set-btn')) {
    const nextTitle = prompt('새 제목을 입력해주세요.', selected.title || '');
    if (nextTitle === null) {
      return;
    }

    const trimmed = nextTitle.trim();
    if (!trimmed) {
      setupError.textContent = '제목은 비워둘 수 없어요.';
      return;
    }

    selected.title = trimmed;
    setSavedSets(sets);
    renderSavedSets();
    setupError.textContent = '문제 세트 제목을 수정했어요.';
    void syncLocalSetsToRemote('제목 변경');
    return;
  }

  if (button.classList.contains('delete-set-btn')) {
    const nextSets = sets.filter((setItem) => setItem.id !== setId);
    setSavedSets(nextSets);
    renderSavedSets();
    void syncLocalSetsToRemote('세트 삭제');
  }
});


refreshSavedBtn?.addEventListener('click', async () => {
  setupError.textContent = '';
  try {
    const count = await pullSetsFromRemote();
    setupError.textContent = `서버에서 ${count}개 세트를 새로고침했어요.`;
  } catch (error) {
    reportSyncError(error, '새로고침');
  }
});

openGuideBtn?.addEventListener('click', () => {
  if (typeof guideModal.showModal === 'function') {
    guideModal.showModal();
  }
});

closeGuideBtn?.addEventListener('click', () => {
  guideModal.close();
});

guideModal?.addEventListener('click', (event) => {
  if (event.target === guideModal) {
    guideModal.close();
  }
});

saveSetConfirmBtn?.addEventListener('click', () => {
  const payload = state.pendingSavePayload;
  if (!payload) {
    closeSaveSetModal();
    return;
  }

  const userTitle = saveSetModalInput?.value || '';
  saveQuestionSet(payload.sanitizedJsonText, payload.questionCount, userTitle);
  setupError.textContent = '문제 세트를 저장했어요.';
  closeSaveSetModal();
});

saveSetCancelBtn?.addEventListener('click', () => {
  closeSaveSetModal();
});

saveSetModal?.addEventListener('click', (event) => {
  if (event.target === saveSetModal) {
    closeSaveSetModal();
  }
});

saveSetModal?.addEventListener('close', () => {
  if (saveSetModalInput) {
    saveSetModalInput.value = '';
  }
});

window.addEventListener('hashchange', applyRouteFromHash);

if (!window.location.hash) {
  setRoute('#/setup', { replace: true });
}

const remoteConfig = getRemoteConfig();
if (firebaseDbUrlInput) {
  firebaseDbUrlInput.value = normalizeFirebaseDbUrl(remoteConfig.firebaseDbUrl);
}

renderSavedSets();
applySetTitlePlaceholder('n');

(async () => {
  try {
    const count = await pullSetsFromRemote();
    if (count > 0) {
      setupError.textContent = `서버에서 ${count}개 세트를 불러왔어요.`;
    }
  } catch (error) {
    reportSyncError(error, '초기 불러오기');
  } finally {
    applyRouteFromHash();
  }
})();
