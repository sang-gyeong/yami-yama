const sampleJson = [
  {
    type: 'multiple',
    question: '다음 중 웹 접근성을 높이는 방법을 모두 고르시오.',
    choices: [
      '이미지에 alt 텍스트 제공',
      '색상만으로 정보 전달',
      '시맨틱 태그 사용',
      '키보드 탐색 지원',
    ],
    answer: [1, 3, 4],
    explanation:
      '대체 텍스트, 시맨틱 마크업, 키보드 지원은 접근성 향상에 핵심입니다.',
  },
  {
    type: 'short',
    question: 'CSS에서 블록 요소를 가로 중앙 정렬할 때 자주 쓰는 속성 조합은?',
    answer: ['margin: 0 auto', 'margin:0 auto'],
    explanation:
      '너비가 지정된 블록 요소에 좌우 margin을 auto로 주면 가운데 정렬됩니다.',
  },
  {
    type: 'essay',
    question: '서술형: 오늘 공부한 내용을 2~3문장으로 요약해보세요.',
    answer: ['핵심 개념을 짧고 명확하게 정리합니다.', '핵심 개념 요약'],
    explanation: '서술형은 제시된 핵심 표현과 의미가 일치하는지 확인해보세요.',
  },
];

const jsonGuideText = JSON.stringify(sampleJson, null, 2);

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: 'immediate',
};

const routes = {
  setup: document.getElementById('setup-screen'),
  exam: document.getElementById('exam-screen'),
  result: document.getElementById('result-screen'),
};

const jsonInput = document.getElementById('json-input');
const jsonExample = document.getElementById('json-example');
const setupError = document.getElementById('setup-error');
const copyGuideBtn = document.getElementById('copy-guide-btn');
const copyGuideStatus = document.getElementById('copy-guide-status');

const progressText = document.getElementById('progress-text');
const modeBadge = document.getElementById('mode-badge');
const reviewModeSelect = document.getElementById('review-mode-select');
const questionTitle = document.getElementById('question-title');
const questionText = document.getElementById('question-text');
const answerArea = document.getElementById('answer-area');
const feedbackBox = document.getElementById('feedback-box');

const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');

const resultSummary = document.getElementById('result-summary');
const resultList = document.getElementById('result-list');
const motivation = document.getElementById('motivation');

jsonExample.textContent = jsonGuideText;
jsonInput.placeholder = jsonGuideText;

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

function normalizeType(type) {
  const map = {
    객관식: 'multiple',
    주관식: 'short',
    서술형: 'essay',
    descriptive: 'essay',
  };

  return map[type] || type;
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

function formatMultipleAnswer(indexes) {
  return indexes.map((idx) => `${idx + 1}번`).join(', ');
}

function formatShortAnswer(answers) {
  return answers.map((answer) => String(answer)).join(' / ');
}

function getCorrectAnswerDisplay(question) {
  if (question.type === 'multiple') {
    return formatMultipleAnswer(question.correctIndexes);
  }
  return formatShortAnswer(question.acceptedAnswers);
}

function parseQuestions(rawText) {
  const parsed = JSON.parse(rawText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('JSON은 비어있지 않은 배열이어야 합니다.');
  }

  return parsed.map((item, index) => {
    const normalizedType = normalizeType(item.type);
    if (!['multiple', 'short', 'essay'].includes(normalizedType)) {
      throw new Error(
        `${
          index + 1
        }번 문제의 type은 multiple, short 또는 essay 이어야 합니다.`,
      );
    }
    if (!item.question || item.answer === undefined || item.answer === null) {
      throw new Error(`${index + 1}번 문제에 question 또는 answer가 없습니다.`);
    }

    if (normalizedType === 'multiple') {
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
        type: normalizedType,
        question: item.question,
        choices: item.choices,
        correctIndexes,
        isMultiAnswer: correctIndexes.length > 1,
        explanation: item.explanation || '해설이 제공되지 않았습니다.',
      };
    }

    const acceptedAnswers = toArray(item.answer)
      .map((answer) => String(answer).trim())
      .filter(Boolean);

    if (acceptedAnswers.length === 0) {
      throw new Error(
        `${index + 1}번 ${
          normalizedType === 'essay' ? '서술형' : '주관식'
        } 문제의 answer가 비어 있습니다.`,
      );
    }

    return {
      type: normalizedType,
      question: item.question,
      choices: [],
      acceptedAnswers,
      explanation: item.explanation || '해설이 제공되지 않았습니다.',
    };
  });
}

function syncReviewMode(mode) {
  state.reviewMode = mode;
  reviewModeSelect.value = mode;
}

function navigateTo(route, useReplace = false) {
  Object.values(routes).forEach((screen) => screen.classList.remove('active'));
  routes[route].classList.add('active');

  const stateData = { route };
  if (useReplace) {
    history.replaceState(stateData, '', `#${route}`);
  } else {
    history.pushState(stateData, '', `#${route}`);
  }
}

function goToRoute(route, useReplace = false) {
  if (route === 'exam' && state.quizSet.length === 0) {
    navigateTo('setup', useReplace);
    return;
  }

  if (route === 'result' && state.answers.length === 0) {
    navigateTo('setup', useReplace);
    return;
  }

  navigateTo(route, useReplace);
}

function getCurrentQuestion() {
  return state.quizSet[state.currentIndex];
}

function renderQuestion() {
  const q = getCurrentQuestion();
  progressText.textContent = `${state.currentIndex + 1} / ${
    state.quizSet.length
  }`;
  modeBadge.textContent =
    state.reviewMode === 'immediate' ? '즉시 채점 모드' : '일괄 채점 모드';
  questionTitle.textContent = `문제 ${state.currentIndex + 1}`;
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
        <label class="choice">
          <input type="${inputType}" name="choice" value="${idx}" />
          ${idx + 1}. ${escapeHtml(choice)}
        </label>
      `,
      )
      .join('');
    return;
  }

  if (q.type === 'essay') {
    answerArea.innerHTML =
      '<textarea class="essay-input" id="essay-answer" rows="5" placeholder="핵심 키워드를 넣어서 2~3문장으로 작성해보세요."></textarea>';
    return;
  }

  answerArea.innerHTML =
    '<input class="short-input" type="text" id="short-answer" placeholder="정답을 입력하세요" />';
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

  if (q.type === 'essay') {
    const input = document.getElementById('essay-answer');
    return input ? input.value : '';
  }

  const input = document.getElementById('short-answer');
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
      return formatMultipleAnswer([...userAnswer].sort((a, b) => a - b));
    }

    if (typeof userAnswer !== 'number') {
      return '선택 없음';
    }
    return `${userAnswer + 1}번`;
  }

  return userAnswer;
}

function renderFeedback(isCorrect, correctAnswerDisplay, explanation) {
  feedbackBox.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  feedbackBox.innerHTML = `
    <div class="feedback-status ${
      isCorrect ? 'status-correct' : 'status-incorrect'
    }">
      ${isCorrect ? '✅ 정답입니다!' : '❌ 오답입니다.'}
    </div>
    <div class="feedback-line answer-line"><strong>정답:</strong> ${escapeHtml(
      correctAnswerDisplay,
    )}</div>
    <div class="feedback-line explanation-line"><strong>해설:</strong> ${escapeHtml(
      explanation,
    )}</div>
  `;
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
  const correctAnswerDisplay = getCorrectAnswerDisplay(question);

  state.answers[state.currentIndex] = {
    userAnswerDisplay: getUserAnswerDisplay(userAnswer, question),
    isCorrect,
    correctAnswerDisplay,
    explanation: question.explanation,
    question: question.question,
  };

  if (state.reviewMode === 'immediate') {
    renderFeedback(isCorrect, correctAnswerDisplay, question.explanation);
  }

  submitBtn.disabled = true;

  if (state.currentIndex === state.quizSet.length - 1) {
    finishBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.remove('hidden');
  }
}

function goNext() {
  state.currentIndex += 1;
  renderQuestion();
}

function renderResult(skipRouteChange = false) {
  if (!skipRouteChange) {
    goToRoute('result');
  }

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
    resultItem.className = `result-item ${
      item.isCorrect ? 'correct' : 'incorrect'
    }`;

    const explanationText =
      state.reviewMode === 'end' || !item.isCorrect
        ? `<div class="feedback-line answer-line"><strong>정답:</strong> ${escapeHtml(
            item.correctAnswerDisplay,
          )}</div><div class="feedback-line explanation-line"><strong>해설:</strong> ${escapeHtml(
            item.explanation,
          )}</div>`
        : '';

    resultItem.innerHTML = `
      <div><strong>${idx + 1}. ${escapeHtml(item.question)}</strong></div>
      <div>내 답: ${escapeHtml(item.userAnswerDisplay)}</div>
      <div class="result-status ${
        item.isCorrect ? 'status-correct' : 'status-incorrect'
      }">${item.isCorrect ? '✅ 정답' : '❌ 오답'}</div>
      ${explanationText}
    `;

    resultList.appendChild(resultItem);
  });

  motivation.textContent =
    wrong > 0
      ? '지금이 성장 타이밍! 틀린 문제를 바로 다시 잡으면 실력이 폭발적으로 올라갑니다. 한 번 더 달려서 점수 갈아치워봐요! 🔥'
      : '와우, 전부 정답! 이 집중력 그대로 다음 세트도 압도해봐요. 오늘 폼 미쳤다! ⚡';

  document.getElementById('retry-wrong-btn').disabled = wrong === 0;
}

function startQuiz(questions) {
  state.quizSet = questions;
  state.answers = new Array(questions.length);
  state.currentIndex = 0;

  goToRoute('exam');
  renderQuestion();
}

async function copyGuideToClipboard() {
  try {
    await navigator.clipboard.writeText(jsonGuideText);
    copyGuideStatus.textContent = '복사 완료! ✅';
  } catch {
    const temp = document.createElement('textarea');
    temp.value = jsonGuideText;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    copyGuideStatus.textContent = '복사 완료! ✅';
  }

  setTimeout(() => {
    copyGuideStatus.textContent = '';
  }, 1500);
}

function handlePopState() {
  const route = location.hash.replace('#', '') || 'setup';
  if (route === 'exam') {
    goToRoute('exam', true);
    if (state.quizSet.length > 0) {
      renderQuestion();
    }
    return;
  }

  if (route === 'result') {
    if (state.answers.length > 0) {
      goToRoute('result', true);
      renderResult(true);
    } else {
      goToRoute('setup', true);
    }
    return;
  }

  goToRoute('setup', true);
}

document.getElementById('start-btn').addEventListener('click', () => {
  setupError.textContent = '';

  try {
    const questions = parseQuestions(jsonInput.value);
    state.originalSet = questions;
    startQuiz([...state.originalSet]);
  } catch (error) {
    setupError.textContent = `문제 세트 로드 실패: ${error.message}`;
  }
});

reviewModeSelect.addEventListener('change', (event) => {
  syncReviewMode(event.target.value);
  if (routes.exam.classList.contains('active') && state.quizSet.length > 0) {
    renderQuestion();
  }
});

copyGuideBtn.addEventListener('click', copyGuideToClipboard);
submitBtn.addEventListener('click', handleSubmit);
nextBtn.addEventListener('click', goNext);
finishBtn.addEventListener('click', renderResult);

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

document.getElementById('go-home-btn').addEventListener('click', () => {
  goToRoute('setup');
});

window.addEventListener('popstate', handlePopState);
syncReviewMode('immediate');
handlePopState();
