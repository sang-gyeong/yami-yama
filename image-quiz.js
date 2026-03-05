const STORAGE_LIST_ENDPOINT =
  'https://firebasestorage.googleapis.com/v0/b/yami-yama.firebasestorage.app/o?maxResults=1000';


const CATEGORY_BASE_NAMES = {
  skull: new Set([
    '!facial, vestibulocochlear','!glossopharyngeal, vagus, accessory_2','!glossopharyngeal, vagus, accessory','!mandibular, lesser petrosal','!oculomotor, trochlear, opthalmic, abducent','anterior clinoid process','articular tubercle_2','articular tubercle','atlantooccipital joint','carotid artery','carotid canal_2','carotid canal','condylar process_2','condylar process','coronoid process_2','coronoid process_3','coronoid process','cribriform plate','crista galli','external occipital crest','external occipital protuberance','facial_2','falx cerebri','foramen lacerum_2','foramen lacerum','foramen magnum','foramen ovale_2','foramen ovale','foramen spinosum_2','foramen spinosum','greater palatine foramen','greater palatine nerve','greater petrosal nerve_2','greater petrosal nerve_3','greater petrosal nerve','hypophyseal fossa','incisive fossa','inferior nuchal line','infraorbital foramen','infraorbital nerve','inion','internal acoustic meatus','jugular foramen','lateral plate of pterygoid process','lesser palatine foramen','lesser petrosal nerve','mandibular foramen','mandibular fossa_2','mandibular fossa','mandibular notch','medial plate of pterygoid process','middle meningeal artery_2','middle meningeal artery_3','middle meningeal artery','mylohyoid groove','olfactory nerve','optic canal','optic nerve','sigmoid sinus','styloid process_2','styloid process_3','styloid process','stylomastoid foramen','superior nuchal line','superior orbital fissure','superior sagittal sinus','supraorbital notch','temporomandibular joint','transverse sinus','vestibulocochlear','vomer','zygomaticofacial foramen',
  ]),
  lowerLimb: new Set([
    'acetabular fossa','adductor tubercle','anterior border_2','anterior border','anterior gluteal line','anterior inferior iliac spine','anterior intercondylar area','anterior superior iliac spine','arcuate line','auricular surface_2','auricular surface','calcaneus','cuboid','distal interphalangeal joint','distal phalanx','fovea of head of femur','gluteal tuberosity','greater sciatic notch','greater trochanter_2','greater trochanter','iliac crest','iliac fossa','iliac tubercle','iliopubic eminence','inferior gluteal line','inferior ramus of pubis','intercondylar eminence','intercondylar fossa','intercondylar line','intermediate cuneiform','interosseous border_2','interosseous border_3','interosseous border_4','interosseous border_5','interosseous border','intertrochanteric crest','intertrochanteric line','ischial spine_2','ischial spine','ischial tuberosity','lateral condyle','lateral cuneiform','lateral epicondyle_2','lateral epicondyle_3','lateral epicondyle','lateral supracondylar line','left femur','left fibula_2','left fibula_3','left fibula','left pelvis_2','left pelvis_3','left pelvis_4','left pelvis','left tibia_2','left tibia','lesser sciatic notch','lesser trochanter_2','lesser trochanter','linea aspera','lunate surface','medial border_2','medial border','medial condyle','medial cuneiform','medial epicondyle_2','medial epicondyle','medial malleolus','medial supracondylar line','metatarsophalangeal joint','middle phalanx','navicular','patellar surface','pectineal line','posterior gluteal line','posterior inferior iliac spine','posterior intercondylar area','posterior superior iliac spine','proximal interphalangeal joint','proximal phalanx','pubic crest','pubic tubercle','right femur_2','right femur','right fibula_2','right fibula_3','right fibula_4','right fibula','right pelvis_2','right pelvis_3','right pelvis','right tibia','superior ramus of pubis','symphyseal surface','talus','tarsometatarsal joint','tibial tuberosity_2','tibial tuberosity',
  ]),
  upperLimb: new Set([
    'acromial end','acromioclavicular joint','acromion_2','acromion_3','acromion','anterior border_2','anterior border','capitate_2','capitate','capitulum','conoid tubercle','coracoid process_2','coracoid process_3','coracoid process','coronoid fossa','coronoid process_2','coronoid process_3','coronoid process','deltoid tuberosity','distal interphalangeal joint','distal phalanx','glenoid fossa','greater tubercle_2','greater tubercle','groove for radial nerve','hamate_2','hamate','impression of costoclavicular ligament','inferior angle_2','inferior angle','infraglenoid tubercle','infraspinous fossa','interosseous border_2','interosseous border_3','interosseous border_4','interosseous border_5','interosseous border','intertubercular groove','lateral angle','lateral epicondyle_2','lateral epicondyle_3','lateral epicondyle','lateral supracondylar ridge','left clavicle_2','left clavicle','left radius_2','left radius_3','left radius_4','left radius','left ulna_2','left ulna_3','left ulna_4','left ulna','lunate surface','lunate_2','lunate','medial border_2','medial border','medial epicondyle_2','medial epicondyle','metacarpal bone','middle phalanx','olecranon fossa','pisiform_2','pisiform','proximal interphalangeal joint','proximal phalanx','radial fossa','radial notch','radial tuberosity','radius','right clavicle_2','right clavicle','right humerus','right radius_3','right radius','right scapula','right ulna_2','right ulna_3','right ulna','scaphoid_2','scaphoid','scapular notch','spine of scapula','sternal end','sternal facet','sternoclavicular joint','styloid process_2','styloid process_3','styloid process','subscapular fossa_2','subscapular fossa','superior angle','superior border','supraglenoid tubercle','supraspinous fossa','surgical neck of humerus','trapezium_2','trapezium','trapezoid_2','trapezoid','triquetrum_2','triquetrum','trochlea','trochlear notch','tuberosity of ulna','ulnar notch',
  ]),
  vrs: new Set([
    'accessory process','anterior tubercle_2','anterior tubercle','articular facet','atlas','auricular surface_2','auricular surface','axis','body of sternum','body of vertebra','clavicular notch','coccynx','costal groove','costal notch','costal tubercle','dens','dorsal sacral foramen','facet for dens','groove for subclavian artery','groove for subclavian vein','groove for vertebral artery','head of rib','inferior articular process','inferior costal facet','inferior vertebral notch','intercostal artery','intercostal nerve','intercostal vein','intermediate sacral crest','jugular notch','lamina','lateral sacral crest','lumbar vertebra','mammilary process','manubrium','median sacral crest','neck of rib','pedicle_2','pedicle','pelvic sacral foramen','posterior arch','posterior tubercle_2','posterior tubercle','sacral canal','sacral cornu','sacral hiatus','sacral promontory_2','sacral promontory','scalene tubercle','single facet on head','spinous process','sternal angle','superior articular process','superior costal facet','thoracic vertebra','transverse costal facet','transverse foramen','transverse line','uncinate process','vertebral foramen','xiphoid process',
  ]),
};

const state = {
  originalSet: [],
  quizSet: [],
  answers: [],
  currentIndex: 0,
  reviewMode: 'immediate',
  orderMode: 'ordered',
  selectedCategories: ['skull', 'lowerLimb', 'upperLimb', 'vrs'],
};

const setupScreen = document.getElementById('setup-screen');
const examScreen = document.getElementById('exam-screen');
const resultScreen = document.getElementById('result-screen');

const setupError = document.getElementById('setup-error');
const progressText = document.getElementById('progress-text');
const modeBadge = document.getElementById('mode-badge');
const questionTitle = document.getElementById('question-title');
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

function normalizeAnswerToken(token) {
  return token.replace(/_\d+$/i, '').trim();
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

function getCategoryKeyFromFileName(fileName) {
  const base = String(fileName).replace(/\.webp$/i, '').trim();
  const category = Object.keys(CATEGORY_BASE_NAMES).find((key) => CATEGORY_BASE_NAMES[key].has(base));
  return category || null;
}

function buildQuestionsFromItems(items) {
  return items.map((item, index) => {
    const fileName = String(item?.name || '').trim();
    const url = buildStorageMediaUrl(fileName);
    const answerToken = parseFileNameFromUrl(url);
    if (!answerToken) {
      throw new Error(`${index + 1}번째 항목이 .webp 이미지 URL이 아닙니다.`);
    }

    const isMulti = answerToken.startsWith('!');
    const answerRaw = isMulti ? answerToken.slice(1) : answerToken;
    const acceptedAnswers = answerRaw
      .split(',')
      .map((part) => normalizeAnswerToken(part.trim()))
      .filter(Boolean);

    if (acceptedAnswers.length === 0) {
      throw new Error(`${index + 1}번째 문항의 정답 정보가 비어 있습니다.`);
    }

    return {
      type: 'short',
      question: '',
      imageUrl: url,
      fileName,
      categoryKey: getCategoryKeyFromFileName(fileName),
      acceptedAnswers,
      acceptedAnswerSet: isMulti,
      explanation: isMulti
        ? `정답: ${acceptedAnswers.join(', ')} (복수 정답)`
        : `정답: ${acceptedAnswers[0]}`,
    };
  });
}

function buildStorageMediaUrl(name) {
  return `https://firebasestorage.googleapis.com/v0/b/yami-yama.firebasestorage.app/o/${encodeURIComponent(
    name,
  )}?alt=media`;
}

async function loadDefaultImageQuizSet() {
  const response = await fetch(STORAGE_LIST_ENDPOINT);
  if (!response.ok) {
    throw new Error(`이미지 목록을 불러오지 못했습니다. (HTTP ${response.status})`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const filteredItems = items
    .filter((item) => String(item?.name || '').trim().toLowerCase().endsWith('.webp'))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'en'));

  if (filteredItems.length === 0) {
    throw new Error('기본 이미지 목록에서 .webp 파일을 찾지 못했습니다.');
  }

  return buildQuestionsFromItems(filteredItems);
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

  questionTitle.textContent = `이미지 ${state.currentIndex + 1}`;

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
        includeUserAnswer: false,
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
  includeUserAnswer = true,
}) {
  const answerTitle = isCorrect ? '정답입니다!' : '오답입니다.';
  return `
    <div class="feedback-title"><strong>${answerTitle}</strong></div>
    ${includeUserAnswer ? `<div class="feedback-row"><strong>내 답:</strong> ${escapeHtml(userAnswerDisplay)}</div>` : ''}
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
    question: `이미지 ${state.currentIndex + 1}`,
  };

  input.disabled = true;

  if (state.reviewMode === 'immediate') {
    feedbackBox.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackBox.innerHTML = buildFeedbackHtml({
      isCorrect,
      userAnswerDisplay: userAnswer,
      correctAnswerDisplay,
      explanation: q.explanation,
      includeUserAnswer: false,
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

function shuffleArray(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function prepareQuestions(questions) {
  const selected = questions.filter((q) => state.selectedCategories.includes(q.categoryKey));

  if (selected.length === 0) {
    throw new Error('선택한 카테고리에 해당하는 문제가 없습니다. 카테고리를 다시 선택해주세요.');
  }

  if (state.orderMode === 'random') {
    return shuffleArray(selected);
  }

  return [...selected].sort((a, b) => a.fileName.localeCompare(b.fileName, 'en'));
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
    const orderMode = document.querySelector('input[name="order-mode"]:checked').value;
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(
      (el) => el.value,
    );

    if (selectedCategories.length === 0) {
      throw new Error('최소 1개 이상의 카테고리를 선택해주세요.');
    }

    state.reviewMode = mode;
    state.orderMode = orderMode;
    state.selectedCategories = selectedCategories;

    const questions = await loadDefaultImageQuizSet();
    state.originalSet = questions;
    startQuiz(prepareQuestions(state.originalSet));
  } catch (error) {
    setupError.textContent = `퀴즈 시작 실패: ${error.message}`;
  }
});

submitBtn.addEventListener('click', handleSubmit);
nextBtn.addEventListener('click', goNext);
finishBtn.addEventListener('click', () => openResult());

document.getElementById('retry-all-btn').addEventListener('click', () => {
  startQuiz(prepareQuestions(state.originalSet));
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

  startQuiz(state.orderMode === 'random' ? shuffleArray(wrongQuestions) : wrongQuestions);
});

document.getElementById('go-home-btn').addEventListener('click', () => openSetup());

window.addEventListener('hashchange', applyRouteFromHash);
if (!window.location.hash) {
  setRoute('#/setup', { replace: true });
}
applyRouteFromHash();
