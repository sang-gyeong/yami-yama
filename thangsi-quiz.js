const state = {
  uploadedImages: [],
  quizImages: [],
  results: [],
  currentIndex: 0,
  timeLimit: 15,
  questionCount: 20,
  timerId: null,
  nextQuestionTimeoutId: null,
  countdownStartedAt: 0,
  countdownDurationMs: 15000,
  activeObjectUrls: new Set(),
};

const setupScreen = document.getElementById('setup-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const timeLimitInput = document.getElementById('time-limit-input');
const questionCountInput = document.getElementById('question-count-input');
const imageInput = document.getElementById('image-input');
const uploadSummary = document.getElementById('upload-summary');
const setupError = document.getElementById('setup-error');

const progressText = document.getElementById('progress-text');
const timerLabel = document.getElementById('timer-label');
const timerText = document.getElementById('timer-text');
const timerBar = document.getElementById('timer-bar');
const questionTitle = document.getElementById('question-title');
const questionImage = document.getElementById('question-image');
const answerArea = document.getElementById('answer-area');
const answerInput = document.getElementById('answer-input');
const answerClosed = document.getElementById('answer-closed');
const skipBtn = document.getElementById('skip-btn');

const resultSummary = document.getElementById('result-summary');
const resultList = document.getElementById('result-list');

function showScreen(screen) {
  [setupScreen, examScreen, resultScreen].forEach((element) => {
    element.classList.remove('active');
  });
  screen.classList.add('active');
}

function shuffleArray(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function revokeActiveObjectUrls() {
  state.activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.activeObjectUrls.clear();
}

async function optimizeImageFile(file) {
  const fallbackUrl = URL.createObjectURL(file);
  state.activeObjectUrls.add(fallbackUrl);

  if (typeof createImageBitmap !== 'function') {
    return fallbackUrl;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    if (scale === 1 && file.type === 'image/webp' && file.size < 1_500_000) {
      bitmap.close();
      return fallbackUrl;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return fallbackUrl;
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.86);
    });

    if (!blob) {
      return fallbackUrl;
    }

    const optimizedUrl = URL.createObjectURL(blob);
    state.activeObjectUrls.add(optimizedUrl);
    URL.revokeObjectURL(fallbackUrl);
    state.activeObjectUrls.delete(fallbackUrl);
    return optimizedUrl;
  } catch (error) {
    return fallbackUrl;
  }
}

async function buildUploadedImageRecords(files) {
  const records = [];

  for (const file of files) {
    const previewUrl = await optimizeImageFile(file);
    records.push({
      id: `${file.name}-${file.lastModified}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: file.name,
      fileSize: file.size,
      previewUrl,
    });
  }

  return records;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)}${units[exponent]}`;
}

function renderUploadSummary() {
  if (state.uploadedImages.length === 0) {
    uploadSummary.className = 'upload-summary empty';
    uploadSummary.textContent = '선택된 이미지가 없습니다.';
    return;
  }

  uploadSummary.className = 'upload-summary';
  const listItems = state.uploadedImages
    .slice(0, 8)
    .map((item) => `<li>${escapeHtml(item.fileName)} <span>(${formatBytes(item.fileSize)})</span></li>`)
    .join('');
  const extraCount = Math.max(0, state.uploadedImages.length - 8);

  uploadSummary.innerHTML = `
    <strong>총 ${state.uploadedImages.length}장 업로드됨</strong>
    <ul class="upload-list">${listItems}</ul>
    ${extraCount > 0 ? `<div>외 ${extraCount}장 더 선택됨</div>` : ''}
  `;
}

function validateSetup() {
  const timeLimit = Number(timeLimitInput.value);
  const questionCount = Number(questionCountInput.value);

  if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 600) {
    throw new Error('제한 시간은 1초 이상 600초 이하의 정수로 입력해주세요.');
  }

  if (!Number.isInteger(questionCount) || questionCount < 1) {
    throw new Error('문제 수는 1개 이상의 정수로 입력해주세요.');
  }

  if (state.uploadedImages.length === 0) {
    throw new Error('이미지를 먼저 업로드해주세요.');
  }

  if (questionCount > state.uploadedImages.length) {
    throw new Error(`업로드한 이미지가 ${state.uploadedImages.length}장이라 최대 ${state.uploadedImages.length}문제까지 설정할 수 있습니다.`);
  }

  return { timeLimit, questionCount };
}

function prepareQuizImages() {
  const shuffled = shuffleArray(state.uploadedImages);
  return shuffled.slice(0, state.questionCount);
}

function clearTimers() {
  if (state.timerId) {
    cancelAnimationFrame(state.timerId);
    state.timerId = null;
  }

  if (state.nextQuestionTimeoutId) {
    clearTimeout(state.nextQuestionTimeoutId);
    state.nextQuestionTimeoutId = null;
  }
}

function getCurrentResult() {
  return state.results[state.currentIndex];
}

function updateAnswerValue() {
  const result = getCurrentResult();
  if (!result) {
    return;
  }
  result.answer = answerInput.value;
}

function updateTimerUi(remainingMs) {
  const safeRemaining = Math.max(0, remainingMs);
  const ratio = Math.max(0, Math.min(1, safeRemaining / state.countdownDurationMs));
  timerText.textContent = `${(safeRemaining / 1000).toFixed(1)}초`;
  timerLabel.textContent = `${Math.ceil(safeRemaining / 1000)}초`;
  timerBar.style.transform = `scaleX(${ratio})`;
}

function closeAnswerInput() {
  updateAnswerValue();
  answerArea.classList.add('hidden');
  answerClosed.classList.remove('hidden');
  answerInput.disabled = true;
}

function moveToNextQuestion() {
  clearTimers();

  if (state.currentIndex >= state.quizImages.length - 1) {
    renderResults();
    showScreen(resultScreen);
    return;
  }

  state.currentIndex += 1;
  renderQuestion();
}


function skipCurrentQuestion() {
  if (!examScreen.classList.contains('active')) {
    return;
  }

  updateAnswerValue();
  moveToNextQuestion();
}

function startCountdown() {
  clearTimers();
  state.countdownDurationMs = state.timeLimit * 1000;
  state.countdownStartedAt = performance.now();
  updateTimerUi(state.countdownDurationMs);

  const tick = (now) => {
    const elapsed = now - state.countdownStartedAt;
    const remaining = state.countdownDurationMs - elapsed;
    updateTimerUi(remaining);

    if (remaining <= 0) {
      closeAnswerInput();
      state.nextQuestionTimeoutId = window.setTimeout(moveToNextQuestion, 500);
      return;
    }

    state.timerId = window.requestAnimationFrame(tick);
  };

  state.timerId = window.requestAnimationFrame(tick);
}

function renderQuestion() {
  const item = state.quizImages[state.currentIndex];
  const result = state.results[state.currentIndex];

  progressText.textContent = `${state.currentIndex + 1} / ${state.quizImages.length} 문제 · 시간 종료 시 자동으로 넘어갑니다. 스킵 버튼으로 바로 다음 문제로 이동할 수 있습니다.`;
  questionTitle.textContent = `문제 ${state.currentIndex + 1}`;
  questionImage.src = item.previewUrl;
  questionImage.alt = `${item.fileName} 미리보기`;

  answerArea.classList.remove('hidden');
  answerClosed.classList.add('hidden');
  answerInput.disabled = false;
  answerInput.value = result.answer;
  answerInput.focus();

  startCountdown();
}

function renderResults() {
  clearTimers();
  resultSummary.innerHTML = `
    <strong>총 ${state.results.length}문제</strong><br />
    제한 시간: 문제당 ${state.timeLimit}초<br />
    업로드 이미지: ${state.uploadedImages.length}장 중 랜덤 ${state.questionCount}장 사용
  `;

  resultList.innerHTML = '';
  state.results.forEach((item, index) => {
    const node = document.createElement('article');
    node.className = 'result-item';
    node.innerHTML = `
      <h3>${index + 1}. ${escapeHtml(item.fileName)}</h3>
      <img class="result-preview" src="${escapeHtml(item.previewUrl)}" alt="${escapeHtml(item.fileName)} 결과 이미지" />
      <div class="result-answer"><strong>내가 제출한 정답:</strong> ${escapeHtml(item.answer.trim() || '미입력')}</div>
    `;
    resultList.appendChild(node);
  });
}

function startQuiz() {
  state.quizImages = prepareQuizImages();
  state.currentIndex = 0;
  state.results = state.quizImages.map((item) => ({
    id: item.id,
    fileName: item.fileName,
    previewUrl: item.previewUrl,
    answer: '',
  }));

  showScreen(examScreen);
  renderQuestion();
}

imageInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files || []);
  clearTimers();
  revokeActiveObjectUrls();
  state.uploadedImages = [];
  state.quizImages = [];
  state.results = [];
  setupError.textContent = '';

  if (files.length === 0) {
    renderUploadSummary();
    return;
  }

  uploadSummary.className = 'upload-summary';
  uploadSummary.textContent = '이미지를 최적화해서 준비하는 중입니다...';

  state.uploadedImages = await buildUploadedImageRecords(files);
  renderUploadSummary();
}
);

answerInput.addEventListener('input', updateAnswerValue);
skipBtn.addEventListener('click', skipCurrentQuestion);
answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
});

document.getElementById('start-btn').addEventListener('click', () => {
  setupError.textContent = '';

  try {
    const { timeLimit, questionCount } = validateSetup();
    state.timeLimit = timeLimit;
    state.questionCount = questionCount;
    startQuiz();
  } catch (error) {
    setupError.textContent = error.message;
  }
});

document.getElementById('restart-btn').addEventListener('click', () => {
  if (state.uploadedImages.length === 0) {
    showScreen(setupScreen);
    return;
  }
  startQuiz();
});

document.getElementById('new-setup-btn').addEventListener('click', () => {
  clearTimers();
  showScreen(setupScreen);
});

window.addEventListener('beforeunload', () => {
  clearTimers();
  revokeActiveObjectUrls();
});

renderUploadSummary();
showScreen(setupScreen);
