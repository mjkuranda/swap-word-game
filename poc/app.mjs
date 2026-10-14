const GAME_SECONDS = 60;
const POINTS_PER_CORRECT = 10;
const FEEDBACK_DELAY_MS = 1100;

const $ = (selector) => document.querySelector(selector);

const startScreen = $("#start-screen");
const gameScreen = $("#game-screen");
const resultScreen = $("#result-screen");
const startButton = $("#start-button");
const playAgainButton = $("#play-again-button");
const answerForm = $("#answer-form");
const answerInput = $("#answer-input");
const submitButton = $("#submit-button");
const sentenceEl = $("#sentence");
const feedbackEl = $("#feedback");
const timerEl = $("#timer");
const timeTextEl = $("#time-text");
const timeBarEl = $("#time-bar");
const taskCounterEl = $("#task-counter");
const correctCountEl = $("#correct-count");
const scoreCountEl = $("#score-count");
const finalScoreEl = $("#final-score");
const finalCorrectEl = $("#final-correct");
const finalAttemptedEl = $("#final-attempted");
const resultTitleEl = $("#result-title");
const resultSubtitleEl = $("#result-subtitle");

let allTasks = [];
let sessionTasks = [];
let currentTaskIndex = 0;
let correctCount = 0;
let attemptedCount = 0;
let score = 0;
let secondsLeft = GAME_SECONDS;
let timerInterval = null;
let feedbackTimeout = null;
let isChecking = false;
let gameStartedAt = 0;
let answerHistory = [];

async function loadTasks() {
    try {
        const response = await fetch("./tasks.json", { cache: "no-store" });
        if (!response.ok)
            throw new Error(`Could not load tasks.json (${response.status})`);
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0)
            throw new Error("tasks.json must contain a non-empty array.");
        allTasks = data.filter(
            (task) =>
                task &&
                typeof task.id === "string" &&
                typeof task.sentence === "string" &&
                typeof task.target === "string" &&
                Array.isArray(task.validAnswers) &&
                task.validAnswers.length > 0,
        );
        if (allTasks.length === 0)
            throw new Error("No valid tasks found in tasks.json.");
        startButton.disabled = false;
        startButton.innerHTML =
            'Start challenge <span aria-hidden="true">→</span>';
    } catch (error) {
        console.error(error);
        startButton.disabled = true;
        startButton.textContent = "Could not load tasks";
        const note = document.createElement("p");
        note.className = "load-error";
        note.textContent =
            "Please run this page through a local web server (for example, VS Code Live Server), then refresh.";
        startButton.insertAdjacentElement("afterend", note);
    }
}

function shuffle(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showScreen(screenToShow) {
    [startScreen, gameScreen, resultScreen].forEach((screen) => {
        screen.hidden = screen !== screenToShow;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function updateTimerUI() {
    timeTextEl.textContent = formatTime(secondsLeft);
    timeBarEl.style.width = `${Math.max(0, (secondsLeft / GAME_SECONDS) * 100)}%`;

    let color = "var(--green)";
    if (secondsLeft <= 10) color = "var(--red)";
    else if (secondsLeft <= 20) color = "var(--orange)";
    else if (secondsLeft <= 35) color = "var(--yellow)";

    timerEl.style.color = color;
    timeBarEl.style.backgroundColor = color;
    timerEl.setAttribute(
        "aria-label",
        `${Math.ceil(secondsLeft)} seconds remaining`,
    );
}

function startGame() {
    if (!allTasks.length) return;
    clearInterval(timerInterval);
    clearTimeout(feedbackTimeout);

    sessionTasks = shuffle(allTasks);
    currentTaskIndex = 0;
    correctCount = 0;
    attemptedCount = 0;
    score = 0;
    secondsLeft = GAME_SECONDS;
    isChecking = false;
    gameStartedAt = Date.now();
    answerHistory = [];
    $("#answer-review").replaceChildren();

    correctCountEl.textContent = "0";
    scoreCountEl.textContent = "0";
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    answerInput.value = "";
    answerInput.disabled = false;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Check answer <span aria-hidden="true">↗</span>';
    submitButton.disabled = false;
    updateTimerUI();
    showScreen(gameScreen);
    renderTask();
    answerInput.focus({ preventScroll: true });

    timerInterval = window.setInterval(() => {
        const elapsed = (Date.now() - gameStartedAt) / 1000;
        secondsLeft = Math.max(0, GAME_SECONDS - elapsed);
        updateTimerUI();
        if (secondsLeft <= 0) endGame();
    }, 100);
}

function renderTask() {
    if (secondsLeft <= 0) {
        endGame();
        return;
    }
    if (currentTaskIndex >= sessionTasks.length) {
        // The current shuffled deck has been completed. Reshuffle for more play,
        // while avoiding an immediate repeat of the last task where possible.
        const previousId = sessionTasks.at(-1)?.id;
        sessionTasks = shuffle(
            allTasks.filter((task) => task.id !== previousId),
        );
        currentTaskIndex = 0;
    }

    const task = sessionTasks[currentTaskIndex];
    const targetIndex = task.sentence
        .toLowerCase()
        .indexOf(task.target.toLowerCase());

    sentenceEl.replaceChildren();
    if (targetIndex === -1) {
        sentenceEl.textContent = task.sentence;
    } else {
        sentenceEl.append(
            document.createTextNode(task.sentence.slice(0, targetIndex)),
        );
        const highlighted = document.createElement("span");
        highlighted.className = "target-word";
        highlighted.textContent = task.sentence.slice(
            targetIndex,
            targetIndex + task.target.length,
        );
        sentenceEl.append(highlighted);
        sentenceEl.append(
            document.createTextNode(
                task.sentence.slice(targetIndex + task.target.length),
            ),
        );
    }

    taskCounterEl.textContent = `TASK ${String(attemptedCount + 1).padStart(2, "0")}`;
    answerInput.value = "";
    answerInput.disabled = false;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Check answer <span aria-hidden="true">↗</span>';
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    isChecking = false;
    answerInput.focus({ preventScroll: true });
}

function normalizeAnswer(value) {
    return value
        .trim()
        .toLocaleLowerCase("en-US")
        .replace(/[.!?]+$/g, "")
        .replace(/\s+/g, " ");
}

function checkAnswer(event) {
    event.preventDefault();
    if (isChecking || secondsLeft <= 0) return;

    const answer = normalizeAnswer(answerInput.value);
    if (!answer) {
        feedbackEl.textContent = "Type a word first, then press Enter.";
        feedbackEl.className = "feedback error";
        answerInput.focus();
        return;
    }

    isChecking = true;
    attemptedCount += 1;
    const task = sessionTasks[currentTaskIndex];
    const acceptedAnswers = task.validAnswers.map(normalizeAnswer);
    const isCorrect = acceptedAnswers.includes(answer);
    answerHistory.push({
        sentence: task.sentence,
        userAnswer: answerInput.value.trim(),
        validAnswers: [...task.validAnswers],
        isCorrect,
    });

    answerInput.disabled = true;
    submitButton.disabled = true;

    if (isCorrect) {
        correctCount += 1;
        score += Number.isFinite(task.points)
            ? task.points
            : POINTS_PER_CORRECT;
        feedbackEl.textContent = `Possible answers: ${task.validAnswers.join(", ")}.`;
        feedbackEl.className = "feedback success";
        answerForm.classList.remove("is-incorrect");
        answerForm.classList.add("is-correct");
        correctCountEl.textContent = String(correctCount);
        scoreCountEl.textContent = String(score);
    } else {
        feedbackEl.textContent = `Possible answers: ${task.validAnswers.join(", ")}.`;
        feedbackEl.className = "feedback error";
        answerForm.classList.remove("is-correct");
        answerForm.classList.add("is-incorrect");
    }

    submitButton.disabled = false;
    submitButton.innerHTML = 'Next <span aria-hidden="true">→</span>';
    const keyboardHint = $("#keyboard-hint");
    if (keyboardHint)
        keyboardHint.innerHTML =
            "Press <kbd>ENTER ↵</kbd> or click Next to continue";
    feedbackTimeout = window.setTimeout(advanceToNextTask, FEEDBACK_DELAY_MS);
}

function advanceToNextTask() {
    clearTimeout(feedbackTimeout);
    answerForm.classList.remove("is-correct", "is-incorrect");
    if (secondsLeft <= 0) {
        endGame();
        return;
    }
    currentTaskIndex += 1;
    renderTask();
    const keyboardHint = $("#keyboard-hint");
    if (keyboardHint)
        keyboardHint.innerHTML =
            "Press <kbd>ENTER ↵</kbd> to check your answer";
}

function endGame() {
    if (gameScreen.hidden) return;
    clearInterval(timerInterval);
    clearTimeout(feedbackTimeout);
    secondsLeft = 0;
    updateTimerUI();
    isChecking = true;

    finalScoreEl.textContent = String(score);
    finalCorrectEl.textContent = String(correctCount);
    finalAttemptedEl.textContent = String(attemptedCount);
    const reviewEl = $("#answer-review");
    reviewEl.replaceChildren();
    if (answerHistory.length === 0) {
        const empty = document.createElement("p");
        empty.className = "review-empty";
        empty.textContent =
            "No answers this round — try again and your answers will appear here.";
        reviewEl.append(empty);
    } else {
        answerHistory.forEach((entry, index) => {
            const item = document.createElement("article");
            item.className =
                "review-item " +
                (entry.isCorrect ? "review-correct" : "review-incorrect");
            const number = document.createElement("span");
            number.className = "review-number";
            number.textContent = String(index + 1).padStart(2, "0");
            const content = document.createElement("div");
            const sentence = document.createElement("p");
            sentence.className = "review-sentence";
            sentence.textContent = entry.sentence;
            const yours = document.createElement("p");
            yours.className = "review-yours";
            yours.textContent =
                "Your answer: " +
                (entry.userAnswer || "(blank)") +
                " " +
                (entry.isCorrect ? "✓" : "✕");
            const alternatives = document.createElement("p");
            alternatives.className = "review-alternatives";
            alternatives.textContent =
                "Accepted answers: " + entry.validAnswers.join(", ");
            content.append(sentence, yours, alternatives);
            item.append(number, content);
            reviewEl.append(item);
        });
    }

    if (correctCount >= 15) {
        resultTitleEl.textContent = "Vocabulary machine!";
        resultSubtitleEl.textContent =
            "Incredible pace. Your word choices are getting stronger.";
    } else if (correctCount >= 8) {
        resultTitleEl.textContent = "Nicely done.";
        resultSubtitleEl.textContent =
            "A strong round. Ready to beat your best?";
    } else if (correctCount > 0) {
        resultTitleEl.textContent = "Good start.";
        resultSubtitleEl.textContent =
            "Every swap builds a stronger vocabulary. Give it another go.";
    } else {
        resultTitleEl.textContent = "Warm-up complete.";
        resultSubtitleEl.textContent =
            "Ready to give it another shot? You’ve got this.";
    }

    showScreen(resultScreen);
}

startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
answerForm.addEventListener("submit", (event) => {
    if (isChecking) {
        event.preventDefault();
        advanceToNextTask();
        return;
    }
    checkAnswer(event);
});
loadTasks();
