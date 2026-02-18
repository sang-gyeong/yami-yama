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

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: 'immediate',
  round: 1,
  currentScreen: 'setup',
};

const setupScreen = document.getElementById('setup-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const jsonInput = document.getElementById('json-input');
const jsonExample = document.getElementById('json-example');
const setupError = document.getElementById('setup-error');
const promptTemplate = document.getElementById('prompt-template');
const copyPromptBtn = document.getElementById('copy-prompt-btn');
const copyFeedback = document.getElementById('copy-feedback');
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

jsonExample.textContent = JSON.stringify(sampleJson, null, 2);
promptTemplate.textContent = medicalPromptTemplate;

function showScreen(screen) {
  [setupScreen, examScreen, resultScreen].forEach((el) =>
    el.classList.remove('active'),
  );
  screen.classList.add('active');
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

function saveQuestionSet(rawJson, questionCount) {
  const sets = getSavedSets();
  const normalizedRaw = rawJson.trim();
  const existing = sets.find((setItem) => setItem.rawJson.trim() === normalizedRaw);

  if (existing) {
    existing.createdAt = new Date().toISOString();
    existing.questionCount = questionCount;
    if (!existing.title) {
      existing.title = `문제 ${questionCount}개 세트`;
    }
    setSavedSets(sets);
    renderSavedSets();
    void syncLocalSetsToRemote('중복 세트 갱신');
    return;
  }

  const newSet = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    questionCount,
    title: `문제 ${questionCount}개 세트`,
    rawJson: normalizedRaw,
  };

  setSavedSets([newSet, ...sets].slice(0, 50));
  renderSavedSets();
  void syncLocalSetsToRemote('새 세트 저장');
}

function extractFirstJsonArray(rawText) {
  let inString = false;
  let escapeNext = false;
  let depth = 0;
  let start = -1;

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
          return rawText.slice(start, index + 1);
        }
      }
    }
  }

  return rawText;
}

function sanitizeJsonInput(rawText) {
  const withoutFence = rawText
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return extractFirstJsonArray(withoutFence).trim();
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
}) {
  const answerTitle = isCorrect ? '정답입니다!' : '오답입니다.';
  return `
    <div class="feedback-title"><strong>${answerTitle}</strong></div>
    <div class="feedback-row"><strong>내 답:</strong> ${escapeHtml(userAnswerDisplay)}</div>
    <div class="feedback-row"><strong>정답:</strong> ${escapeHtml(correctAnswerDisplay)}</div>
    <div class="feedback-row feedback-explanation"><strong>해설:</strong> ${escapeHtml(explanation)}</div>
  `;
}

function parseQuestions(rawText) {
  const sanitizedJsonText = sanitizeJsonInput(rawText);
  const parsed = JSON.parse(sanitizedJsonText);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON은 비어있지 않은 배열이어야 합니다.');
  }

  const questions = parsed.map((item, index) => {
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

      const correctIndexes = parseMultipleAnswerIndexes(
        item.answer,
        item.choices,
        index,
      );
      return {
        type: item.type,
        question: item.question,
        choices: item.choices,
        correctIndexes,
        isMultiAnswer: correctIndexes.length > 1,
        explanation: item.explanation || '해설이 제공되지 않았습니다.',
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
      explanation: item.explanation || '해설이 제공되지 않았습니다.',
    };
  });

  return { questions, sanitizedJsonText };
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
  showScreen(setupScreen);
  setRoute('#/setup', { replace });
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

  const typeLabel =
    q.type === 'multiple' ? '객관식' : q.type === 'short' ? '주관식' : '서술형';
  questionTitle.textContent = `문제 ${state.currentIndex + 1} (${typeLabel})`;
  questionText.textContent = q.question;

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
    answerArea.innerHTML =
      '<input class="short-input" type="text" id="text-answer" placeholder="정답을 입력하세요" />';
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
    feedbackBox.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackBox.innerHTML = buildFeedbackHtml({
      isCorrect,
      userAnswerDisplay,
      correctAnswerDisplay,
      explanation: question.explanation,
    });

    if (question.type === 'multiple') {
      paintChoiceResult(question, userAnswer);
    } else {
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
  const correct = state.answers.filter((a) => a.isCorrect).length;
  const wrong = total - correct;
  const score = Math.round((correct / total) * 100);

  resultSummary.innerHTML = `
    <strong>점수:</strong> ${score}점 (${correct} / ${total} 정답)<br/>
    <strong>오답:</strong> ${wrong}개
  `;

  resultList.innerHTML = '';
  state.answers.forEach((item, idx) => {
    const resultItem = document.createElement('div');
    resultItem.className = `result-item ${item.isCorrect ? '' : 'incorrect'}`;

    const explanationText =
      state.reviewMode === 'end' || !item.isCorrect
        ? `<div><strong>정답:</strong> ${escapeHtml(
            item.correctAnswerDisplay,
          )}</div><div><strong>해설:</strong> ${escapeHtml(
            item.explanation,
          )}</div>`
        : '';

    resultItem.innerHTML = `
      <div><strong>${idx + 1}. ${escapeHtml(item.question)}</strong></div>
      <div>내 답: ${escapeHtml(item.userAnswerDisplay)}</div>
      <div>${item.isCorrect ? '✅ 정답' : '❌ 오답'}</div>
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

document.getElementById('start-btn').addEventListener('click', () => {
  setupError.textContent = '';

  try {
    const { questions, sanitizedJsonText } = parseQuestions(jsonInput.value);
    jsonInput.value = sanitizedJsonText;
    saveQuestionSet(sanitizedJsonText, questions.length);
    state.originalSet = questions;
    const mode = document.querySelector('input[name="review-mode"]:checked').value;
    state.reviewMode = mode;
    state.round = 1;
    startQuiz([...state.originalSet]);
  } catch (error) {
    setupError.textContent = `문제 세트 로드 실패: ${error.message}`;
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

window.addEventListener('hashchange', applyRouteFromHash);

if (!window.location.hash) {
  setRoute('#/setup', { replace: true });
}

const remoteConfig = getRemoteConfig();
if (firebaseDbUrlInput) {
  firebaseDbUrlInput.value = normalizeFirebaseDbUrl(remoteConfig.firebaseDbUrl);
}

renderSavedSets();

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
