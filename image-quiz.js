const IMAGE_MANIFEST_ENDPOINT =
  'https://yami-yama-default-rtdb.firebaseio.com/imageQuizWebpUrls.json';

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: 'immediate',
};

const setupScreen = document.getElementById('setup-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const setupError = document.getElementById('setup-error');
const progressText = document.getElementById('progress-text');
const modeBadge = document.getElementById('mode-badge');
const questionTitle = document.getElementById('question-title');
const questionText = document.getElementById('question-text');
const questionMedia = document.getElementById('question-media');
const answerArea = document.getElementById('answer-area');
const feedbackBox = document.getElementById('feedback-box');
const examActions = document.getElementById('exam-actions');

const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');

const resultSummary = document.getElementById('result-summary');
const motivation = document.getElementById('motivation');
const resultList = document.getElementById('result-list');

function showScreen(screen) {
  [setupScreen, examScreen, resultScreen].forEach((el) => el.classList.remove('active'));
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

function normalizeCsvAnswerSet(value) {
  return String(value)
    .split(',')
    .map((part) => normalize(part))
    .filter(Boolean)
    .sort();
}

function parseFileNameFromUrl(urlText) {
  const clean = String(urlText).split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(clean);
  const file = decoded.split('/').pop() || '';

  if (!file.toLowerCase().endsWith('.webp')) {
    return '';
  }

  return file.replace(/\.webp$/i, '').trim();
}

function buildQuestionsFromUrls(urls) {
  return urls.map((url, index) => {
    const answerToken = parseFileNameFromUrl(url);
    if (!answerToken) {
      throw new Error(`${index + 1}번째 항목이 .webp 이미지 URL이 아닙니다.`);
    }

    const isMulti = answerToken.startsWith('!');
    const answerRaw = isMulti ? answerToken.slice(1) : answerToken;
    const acceptedAnswers = answerRaw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (acceptedAnswers.length === 0) {
      throw new Error(`${index + 1}번째 문항의 정답 정보가 비어 있습니다.`);
    }

    return {
      type: 'short',
      question: `문제 ${index + 1}. 이미지의 해부학 명칭을 입력하세요.`,
      imageUrl: url,
      acceptedAnswers,
      acceptedAnswerSet: isMulti,
      explanation: isMulti
        ? `정답: ${acceptedAnswers.join(', ')} (복수 정답)`
        : `정답: ${acceptedAnswers[0]}`,
    };
  });
}

async function loadImageQuizSet() {
  const response = await fetch(IMAGE_MANIFEST_ENDPOINT);
  if (!response.ok) {
    throw new Error(`퀴즈 데이터를 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('퀴즈 데이터가 비어 있습니다.');
  }

  const urls = payload.map((item) => String(item || '').trim()).filter(Boolean);
  return buildQuestionsFromUrls(urls);
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
  showScreen(setupScreen);
  setRoute('#/setup', { replace });
}

function openExam({ replace = false } = {}) {
  if (state.quizSet.length === 0) {
    openSetup({ replace: true });
    return;
  }

  showScreen(examScreen);
  renderQuestion();
  setRoute(getExamHash(), { replace });
}

function openResult({ replace = false } = {}) {
  if (state.answers.length === 0 || state.answers.some((answer) => !answer)) {
    openSetup({ replace: true });
    return;
  }

  showScreen(resultScreen);
  renderResultContent();
  setRoute('#/result', { replace });
}

function renderQuestion() {
  const q = getCurrentQuestion();
  progressText.textContent = `${state.currentIndex + 1} / ${state.quizSet.length}`;
  modeBadge.textContent =
    state.reviewMode === 'immediate' ? '즉시 채점 모드' : '일괄 채점 모드';

  questionTitle.textContent = `문제 ${state.currentIndex + 1} (주관식)`;
  questionText.textContent = q.question;

  const guide = q.acceptedAnswerSet
    ? '<p class="question-guide">복수 정답: 쉼표(,)로 구분해 입력하세요. 순서/대소문자 무관</p>'
    : '<p class="question-guide">대소문자 구분 없이 입력 가능</p>';

  questionMedia.innerHTML =
    `<img src="${escapeHtml(q.imageUrl)}" alt="문제 이미지 ${state.currentIndex + 1}" class="question-image" />${guide}`;

  const placeholder = q.acceptedAnswerSet
    ? '정답들을 쉼표(,)로 구분해서 입력하세요'
    : '정답을 입력하세요';

  answerArea.innerHTML =
    `<input class="short-input" type="text" id="text-answer" placeholder="${placeholder}" />`;

  feedbackBox.className = 'feedback hidden';
  feedbackBox.textContent = '';

  submitBtn.classList.remove('hidden');
  nextBtn.classList.add('hidden');
  finishBtn.classList.add('hidden');

  const existing = state.answers[state.currentIndex];
  if (existing) {
    const input = document.getElementById('text-answer');
    input.value = existing.rawUserAnswer;
    input.disabled = true;

    if (state.reviewMode === 'immediate') {
      feedbackBox.className = `feedback ${existing.isCorrect ? 'correct' : 'incorrect'}`;
      feedbackBox.innerHTML = buildFeedbackHtml({
        isCorrect: existing.isCorrect,
        userAnswerDisplay: existing.userAnswerDisplay,
        correctAnswerDisplay: existing.correctAnswerDisplay,
        explanation: q.explanation,
      });
    }

    submitBtn.classList.add('hidden');
    if (state.currentIndex === state.quizSet.length - 1) {
      finishBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
    }
  }
}

function evaluateAnswer(userAnswer, question) {
  if (question.acceptedAnswerSet) {
    const userSet = normalizeCsvAnswerSet(userAnswer);
    const answerSet = question.acceptedAnswers.map((answer) => normalize(answer)).sort();

    if (userSet.length !== answerSet.length) {
      return false;
    }

    return userSet.every((value, idx) => value === answerSet[idx]);
  }

  return question.acceptedAnswers.some((answer) => normalize(userAnswer) === normalize(answer));
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
    <div class="feedback-row"><strong>해설:</strong> ${escapeHtml(explanation)}</div>
  `;
}

function handleSubmit() {
  const q = getCurrentQuestion();
  const input = document.getElementById('text-answer');
  const userAnswer = input.value;

  if (!userAnswer.trim()) {
    feedbackBox.className = 'feedback incorrect';
    feedbackBox.textContent = '답안을 입력해주세요.';
    return;
  }

  const isCorrect = evaluateAnswer(userAnswer, q);
  const correctAnswerDisplay = q.acceptedAnswers.join(' / ');

  state.answers[state.currentIndex] = {
    rawUserAnswer: userAnswer,
    userAnswerDisplay: userAnswer,
    isCorrect,
    correctAnswerDisplay,
    explanation: q.explanation,
    question: q.question,
  };

  input.disabled = true;

  if (state.reviewMode === 'immediate') {
    feedbackBox.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackBox.innerHTML = buildFeedbackHtml({
      isCorrect,
      userAnswerDisplay: userAnswer,
      correctAnswerDisplay,
      explanation: q.explanation,
    });
  }

  submitBtn.classList.add('hidden');

  if (state.currentIndex === state.quizSet.length - 1) {
    finishBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }

  examActions.scrollIntoView({ behavior: 'smooth', block: 'end' });
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

  resultSummary.innerHTML = `<strong>점수:</strong> ${score}점 (${correct} / ${total} 정답)<br/><strong>오답:</strong> ${wrong}개`;

  resultList.innerHTML = '';
  state.answers.forEach((item, idx) => {
    const node = document.createElement('div');
    node.className = `result-item ${item.isCorrect ? '' : 'incorrect'}`;

    const explanationText =
      state.reviewMode === 'end' || !item.isCorrect
        ? `<div><strong>정답:</strong> ${escapeHtml(item.correctAnswerDisplay)}</div><div><strong>해설:</strong> ${escapeHtml(item.explanation)}</div>`
        : '';

    node.innerHTML = `
      <div><strong>${idx + 1}. ${escapeHtml(item.question)}</strong></div>
      <div>내 답: ${escapeHtml(item.userAnswerDisplay)}</div>
      <div>${item.isCorrect ? '✅ 정답' : '❌ 오답'}</div>
      ${explanationText}
    `;

    resultList.appendChild(node);
  });

  if (wrong > 0) {
    motivation.textContent =
      '지금이 성장 타이밍! 틀린 문제를 다시 잡으면 실력이 빠르게 올라갑니다. 🔥';
  } else {
    motivation.textContent = '완벽해요! 이 집중력 그대로 다음 세트도 도전해봐요. ⚡';
  }

  document.getElementById('retry-wrong-btn').classList.toggle('hidden', wrong === 0);
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

document.getElementById('start-btn').addEventListener('click', async () => {
  setupError.textContent = '';

  try {
    const mode = document.querySelector('input[name="review-mode"]:checked').value;
    state.reviewMode = mode;

    const questions = await loadImageQuizSet();
    state.originalSet = questions;
    startQuiz([...state.originalSet]);
  } catch (error) {
    setupError.textContent = `퀴즈 시작 실패: ${error.message}`;
  }
});

submitBtn.addEventListener('click', handleSubmit);
nextBtn.addEventListener('click', goNext);
finishBtn.addEventListener('click', () => openResult());

document.getElementById('retry-all-btn').addEventListener('click', () => {
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

  startQuiz(wrongQuestions);
});

document.getElementById('go-home-btn').addEventListener('click', () => openSetup());

window.addEventListener('hashchange', applyRouteFromHash);
if (!window.location.hash) {
  setRoute('#/setup', { replace: true });
}
applyRouteFromHash();
