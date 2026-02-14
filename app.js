const sampleJson = [
  {
    type: "multiple",
    question: "HTTP 상태코드 404의 의미는?",
    choices: ["요청 성공", "서버 오류", "리소스를 찾을 수 없음", "권한 없음"],
    answer: "리소스를 찾을 수 없음",
    explanation: "404 Not Found는 서버에 요청한 리소스가 존재하지 않을 때 사용됩니다."
  },
  {
    type: "short",
    question: "CSS에서 요소를 가로 중앙 정렬할 때 자주 사용하는 속성 조합은? (블록 요소 기준)",
    answer: "margin: 0 auto",
    explanation: "너비가 있는 블록 요소의 좌우 마진을 auto로 설정하면 가로 중앙 정렬됩니다."
  }
];

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: "immediate",
  round: 1
};

const setupScreen = document.getElementById("setup-screen");
const examScreen = document.getElementById("exam-screen");
const resultScreen = document.getElementById("result-screen");

const jsonInput = document.getElementById("json-input");
const jsonExample = document.getElementById("json-example");
const setupError = document.getElementById("setup-error");

const progressText = document.getElementById("progress-text");
const modeBadge = document.getElementById("mode-badge");
const questionTitle = document.getElementById("question-title");
const questionText = document.getElementById("question-text");
const answerArea = document.getElementById("answer-area");
const feedbackBox = document.getElementById("feedback-box");

const submitBtn = document.getElementById("submit-btn");
const nextBtn = document.getElementById("next-btn");
const finishBtn = document.getElementById("finish-btn");

const resultSummary = document.getElementById("result-summary");
const resultList = document.getElementById("result-list");
const motivation = document.getElementById("motivation");

jsonExample.textContent = JSON.stringify(sampleJson, null, 2);

function showScreen(screen) {
  [setupScreen, examScreen, resultScreen].forEach((el) => el.classList.remove("active"));
  screen.classList.add("active");
}

function normalize(value) {
  return String(value).trim().toLowerCase();
}

function parseQuestions(rawText) {
  const parsed = JSON.parse(rawText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("JSON은 비어있지 않은 배열이어야 합니다.");
  }

  return parsed.map((item, index) => {
    if (!["multiple", "short"].includes(item.type)) {
      throw new Error(`${index + 1}번 문제의 type은 multiple 또는 short 이어야 합니다.`);
    }
    if (!item.question || !item.answer) {
      throw new Error(`${index + 1}번 문제에 question 또는 answer가 없습니다.`);
    }
    if (item.type === "multiple") {
      if (!Array.isArray(item.choices) || item.choices.length < 2) {
        throw new Error(`${index + 1}번 객관식 문제는 choices 배열(2개 이상)이 필요합니다.`);
      }
    }

    return {
      type: item.type,
      question: item.question,
      choices: item.choices || [],
      answer: String(item.answer),
      explanation: item.explanation || "해설이 제공되지 않았습니다."
    };
  });
}

function getCurrentQuestion() {
  return state.quizSet[state.currentIndex];
}

function renderQuestion() {
  const q = getCurrentQuestion();
  progressText.textContent = `${state.currentIndex + 1} / ${state.quizSet.length}`;
  modeBadge.textContent = state.reviewMode === "immediate" ? "즉시 채점 모드" : "일괄 채점 모드";
  questionTitle.textContent = `문제 ${state.currentIndex + 1}`;
  questionText.textContent = q.question;

  feedbackBox.className = "feedback hidden";
  feedbackBox.textContent = "";

  submitBtn.disabled = false;
  submitBtn.classList.remove("hidden");
  nextBtn.classList.add("hidden");
  finishBtn.classList.add("hidden");

  if (q.type === "multiple") {
    answerArea.innerHTML = q.choices
      .map(
        (choice, idx) => `
        <label class="choice">
          <input type="radio" name="choice" value="${String(choice).replaceAll('"', '&quot;')}" />
          ${idx + 1}. ${choice}
        </label>
      `
      )
      .join("");
  } else {
    answerArea.innerHTML = '<input class="short-input" type="text" id="short-answer" placeholder="정답을 입력하세요" />';
  }
}

function collectUserAnswer() {
  const q = getCurrentQuestion();
  if (q.type === "multiple") {
    const selected = document.querySelector('input[name="choice"]:checked');
    return selected ? selected.value : "";
  }
  const input = document.getElementById("short-answer");
  return input ? input.value : "";
}

function evaluateAnswer(userAnswer, question) {
  return normalize(userAnswer) === normalize(question.answer);
}

function handleSubmit() {
  const question = getCurrentQuestion();
  const userAnswer = collectUserAnswer();

  if (!userAnswer.trim()) {
    feedbackBox.className = "feedback incorrect";
    feedbackBox.textContent = "답안을 입력하거나 선택해주세요.";
    return;
  }

  const isCorrect = evaluateAnswer(userAnswer, question);
  state.answers[state.currentIndex] = {
    userAnswer,
    isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation,
    question: question.question
  };

  if (state.reviewMode === "immediate") {
    feedbackBox.className = `feedback ${isCorrect ? "correct" : "incorrect"}`;
    feedbackBox.innerHTML = `
      <strong>${isCorrect ? "정답입니다!" : "오답입니다."}</strong><br/>
      정답: ${question.answer}<br/>
      해설: ${question.explanation}
    `;
  }

  submitBtn.disabled = true;

  if (state.currentIndex === state.quizSet.length - 1) {
    finishBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.remove("hidden");
  }
}

function goNext() {
  state.currentIndex += 1;
  renderQuestion();
}

function renderResult() {
  showScreen(resultScreen);

  const total = state.answers.length;
  const correct = state.answers.filter((a) => a.isCorrect).length;
  const wrong = total - correct;
  const score = Math.round((correct / total) * 100);

  resultSummary.innerHTML = `
    <strong>점수:</strong> ${score}점 (${correct} / ${total} 정답)<br/>
    <strong>오답:</strong> ${wrong}개
  `;

  resultList.innerHTML = "";
  state.answers.forEach((item, idx) => {
    const resultItem = document.createElement("div");
    resultItem.className = `result-item ${item.isCorrect ? "" : "incorrect"}`;

    const explanationText =
      state.reviewMode === "end" || !item.isCorrect
        ? `<div><strong>정답:</strong> ${item.correctAnswer}</div><div><strong>해설:</strong> ${item.explanation}</div>`
        : "";

    resultItem.innerHTML = `
      <div><strong>${idx + 1}. ${item.question}</strong></div>
      <div>내 답: ${item.userAnswer}</div>
      <div>${item.isCorrect ? "✅ 정답" : "❌ 오답"}</div>
      ${explanationText}
    `;

    resultList.appendChild(resultItem);
  });

  if (wrong > 0) {
    motivation.textContent =
      "괜찮아요, 오답은 실력 향상의 지름길입니다. 틀린 문제만 다시 풀어보며 정확도를 끌어올려봅시다!";
  } else {
    motivation.textContent = "완벽합니다! 지금 페이스를 유지해보세요. 🚀";
  }

  document.getElementById("retry-wrong-btn").disabled = wrong === 0;
}

function startQuiz(questions) {
  state.quizSet = questions;
  state.answers = new Array(questions.length);
  state.currentIndex = 0;

  showScreen(examScreen);
  renderQuestion();
}

document.getElementById("start-btn").addEventListener("click", () => {
  setupError.textContent = "";

  try {
    const questions = parseQuestions(jsonInput.value);
    state.originalSet = questions;
    const mode = document.querySelector('input[name="review-mode"]:checked').value;
    state.reviewMode = mode;
    state.round = 1;
    startQuiz([...state.originalSet]);
  } catch (error) {
    setupError.textContent = `JSON 파싱 실패: ${error.message}`;
  }
});

submitBtn.addEventListener("click", handleSubmit);
nextBtn.addEventListener("click", goNext);
finishBtn.addEventListener("click", renderResult);

document.getElementById("retry-all-btn").addEventListener("click", () => {
  state.round += 1;
  startQuiz([...state.originalSet]);
});

document.getElementById("retry-wrong-btn").addEventListener("click", () => {
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

document.getElementById("go-home-btn").addEventListener("click", () => {
  showScreen(setupScreen);
});
