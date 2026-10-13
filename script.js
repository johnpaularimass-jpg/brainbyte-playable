document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const $ = id => document.getElementById(id);
    const questions = Array.isArray(window.questions)
        ? window.questions
        : (Array.isArray(window.levels) ? window.levels : []);

    if (!questions.length) {
        alert("BrainByte: No questions were loaded. Check Data/question.js.");
        return;
    }

    const USERS_KEY = "brainbyte_users";
    const CURRENT_USER_KEY = "brainbyte_current_user";

    let users = loadJSON(USERS_KEY, {});
    let currentUser = localStorage.getItem(CURRENT_USER_KEY) || "Dante";

    if (!users[currentUser]) {
        users[currentUser] = { score: 0, level: 0, bestScore: 0 };
        saveUsers();
    }

    let currentQuestion = clamp(Number(users[currentUser].level) || 0, 0, questions.length - 1);
    let score = Number(users[currentUser].score) || 0;
    let bestScore = Number(users[currentUser].bestScore) || 0;
    let streak = 0;
    let lives = 3;
    let bugsFound = 0;
    let remainingTime = 60;
    let timerId = null;
    let paused = false;
    let gameActive = false;
    let questionAnswered = false;
    let selectedBugLines = new Set();

    const savedTimer = localStorage.getItem("brainbyte_timer");
    if (savedTimer) remainingTime = Number(savedTimer) || 60;

    function loadJSON(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    }

    function saveUsers() {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(CURRENT_USER_KEY, currentUser);
    }

    function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getLines(value) {
        if (Array.isArray(value)) return value.map(String);
        return String(value ?? "").replace(/\r\n/g, "\n").split("\n");
    }

    function getReference(question) {
        return getLines(question.reference ?? question.correctCode ?? "");
    }

    function getBuggy(question) {
        return getLines(question.buggy ?? question.challengeCode ?? "");
    }

    function getBugObjects(question) {
        if (Array.isArray(question.bugs)) return question.bugs;
        if (Array.isArray(question.bugLines)) return question.bugLines.map(line => ({ line }));
        if (Number.isInteger(question.bugLine)) return [{ line: question.bugLine }];
        return [];
    }

    function getCorrectBugLines(question) {
        const explicit = getBugObjects(question)
            .map(b => Number(b.line))
            .filter(n => Number.isFinite(n) && n > 0);

        if (explicit.length) return [...new Set(explicit)];

        const ref = getReference(question);
        const bug = getBuggy(question);
        const max = Math.max(ref.length, bug.length);
        const diff = [];
        for (let i = 0; i < max; i++) {
            if ((ref[i] ?? "") !== (bug[i] ?? "")) diff.push(i + 1);
        }
        return diff;
    }

    function getBugExplanation(question, lines) {
        const bugs = getBugObjects(question);
        if (!bugs.length) return question.explanation || "Compare the debugging code with the reference code.";
        return lines.map(line => {
            const found = bugs.find(b => Number(b.line) === line);
            return found?.explanation || `Line ${line} needs to match the reference code.`;
        }).join(" ");
    }

    function getTimeForQuestion(question) {
        const option = Number($("timer-option")?.value);
        return Number(question.time) || option || 60;
    }

    function updateUserName() {
        if ($("current-user-name")) $("current-user-name").textContent = currentUser;
        if ($("game-user-name")) $("game-user-name").textContent = currentUser;
    }

    function showScreen(showGame) {
        $("welcome-screen")?.classList.toggle("hidden", showGame);
        $("game-container")?.classList.toggle("hidden", !showGame);
    }

    function openModal(id) { $(id)?.classList.remove("hidden"); }
    function closeModal(id) { $(id)?.classList.add("hidden"); }

    function stopTimer() {
        if (timerId) clearInterval(timerId);
        timerId = null;
    }

    function startTimer() {
        stopTimer();
        if (!gameActive || paused || questionAnswered) return;

        timerId = setInterval(() => {
            if (paused || !gameActive || questionAnswered) return;
            remainingTime--;
            updateTimer();

            if (remainingTime <= 0) {
                remainingTime = 0;
                updateTimer();
                handleTimeUp();
            }
        }, 1000);
    }

    function updateTimer() {
        if ($("timer")) $("timer").textContent = remainingTime;
    }

    function updateLives() {
        if ($("lives-display")) {
            $("lives-display").textContent = "❤️ ".repeat(lives).trim() || "💔";
        }
    }

    function updateStats() {
        const q = questions[currentQuestion];
        const totalBugs = Math.max(getCorrectBugLines(q).length, 1);
        if ($("score")) $("score").textContent = score;
        if ($("streak")) $("streak").textContent = streak;
        if ($("best-score")) $("best-score").textContent = bestScore;
        if ($("bugs-found")) $("bugs-found").textContent = `${bugsFound} / ${totalBugs}`;
        if ($("level")) $("level").textContent = currentQuestion + 1;
        if ($("progress-level")) $("progress-level").textContent = currentQuestion + 1;
        if ($("total-levels")) $("total-levels").textContent = questions.length;
        const pct = Math.round(((currentQuestion + 1) / questions.length) * 100);
        if ($("progress-percent")) $("progress-percent").textContent = `${pct}%`;
        if ($("progress-fill")) $("progress-fill").style.width = `${pct}%`;
        if ($("difficulty")) $("difficulty").textContent = q.difficulty || "EASY";
        if ($("language")) $("language").textContent = q.language || "JavaScript";
    }

    function updateSelectionUI() {
        const lines = [...selectedBugLines].sort((a,b) => a-b);
        if ($("selected-lines-count")) $("selected-lines-count").textContent = lines.length;
        if ($("selected-lines-display")) {
            $("selected-lines-display").textContent = lines.length
                ? `Line${lines.length > 1 ? "s" : ""} selected: ${lines.join(", ")}`
                : "No lines selected.";
        }
    }

    function renderCode(container, code, clickable) {
        if (!container) return;
        const lines = getLines(code);
        container.innerHTML = `<div class="bb-code-wrapper">${
            lines.map((line, index) => {
                const lineNo = index + 1;
                return `<div class="bb-code-line ${clickable ? "bb-debug-line" : ""}" data-line="${lineNo}">
                    <span class="bb-line-number">${lineNo}</span>
                    <span class="bb-line-code">${escapeHTML(line) || "&nbsp;"}</span>
                </div>`;
            }).join("")
        }</div>`;

        if (clickable) {
            container.querySelectorAll(".bb-debug-line").forEach(row => {
                row.addEventListener("click", () => {
                    if (!gameActive || paused || questionAnswered) return;
                    const line = Number(row.dataset.line);
                    if (selectedBugLines.has(line)) {
                        selectedBugLines.delete(line);
                        row.classList.remove("bb-selected-line");
                    } else {
                        selectedBugLines.add(line);
                        row.classList.add("bb-selected-line");
                    }
                    updateSelectionUI();
                });
            });
        }
    }

    function clearResult() {
        if ($("result-message")) {
            $("result-message").textContent = "";
            $("result-message").className = "result-message";
        }
        if ($("explanation")) $("explanation").textContent = "";
    }

    function loadQuestion() {
        const q = questions[currentQuestion];
        selectedBugLines.clear();
        questionAnswered = false;
        paused = false;
        bugsFound = 0;
        remainingTime = getTimeForQuestion(q);

        renderCode($("correct-code"), getReference(q), false);
        renderCode($("challenge-code"), getBuggy(q), true);

        if ($("hint-text")) $("hint-text").textContent =
            q.hint || "Compare the debugging code with the reference code and look for changes.";

        if ($("reference-language")) $("reference-language").textContent =
            q.language ? String(q.language).toUpperCase() : "CORRECT";

        if ($("check-button")) $("check-button").disabled = false;
        if ($("next-button")) $("next-button").disabled = true;

        updateSelectionUI();
        clearResult();
        updateStats();
        updateLives();
        updateTimer();
        localStorage.setItem("brainbyte_timer", remainingTime);
        startTimer();
    }

    function saveProgress() {
        users[currentUser] = {
            score,
            level: currentQuestion,
            bestScore
        };
        saveUsers();
    }

    function revealAnswer(correct, selected, correctLines) {
        const rows = $("challenge-code")?.querySelectorAll(".bb-debug-line") || [];
        rows.forEach(row => {
            const line = Number(row.dataset.line);
            row.classList.remove("bb-selected-line");
            if (correctLines.includes(line)) row.classList.add(correct ? "bb-correct-line" : "bb-wrong-line");
            if (!correct && selected.includes(line) && !correctLines.includes(line)) row.classList.add("bb-wrong-line");
        });
    }

    function checkAnswer() {
        if (!gameActive || paused || questionAnswered) return;

        const q = questions[currentQuestion];
        const correctLines = getCorrectBugLines(q).sort((a,b) => a-b);
        const selected = [...selectedBugLines].sort((a,b) => a-b);

        if (!selected.length) {
            if ($("result-message")) {
                $("result-message").textContent = "SELECT AT LEAST ONE LINE.";
                $("result-message").className = "result-message error";
            }
            if ($("explanation")) $("explanation").textContent = "Click the suspicious line or lines first.";
            return;
        }

        const correct = selected.length === correctLines.length &&
            selected.every((line, i) => line === correctLines[i]);

        if (correct) {
            questionAnswered = true;
            stopTimer();
            bugsFound = correctLines.length;
            streak++;
            const points = 100 + (streak - 1) * 25 + remainingTime * 2;
            score += points;
            bestScore = Math.max(bestScore, score);
            revealAnswer(true, selected, correctLines);

            if ($("result-message")) {
                $("result-message").textContent = `✓ CORRECT! +${points} POINTS`;
                $("result-message").className = "result-message success";
            }
            if ($("explanation")) {
                $("explanation").textContent = getBugExplanation(q, correctLines);
            }
            if ($("check-button")) $("check-button").disabled = true;
            if ($("next-button")) $("next-button").disabled = false;
            saveProgress();
            updateStats();
        } else {
            lives--;
            streak = 0;
            updateLives();
            if ($("result-message")) {
                $("result-message").textContent = `✕ NOT QUITE. ${lives} ${lives === 1 ? "LIFE" : "LIVES"} LEFT.`;
                $("result-message").className = "result-message error";
            }
            if ($("explanation")) {
                $("explanation").textContent = "Try again. Check the reference code carefully.";
            }
            revealAnswer(false, selected, correctLines);

            // Important: wrong answers are RETRYABLE.
            // The question is not locked, and the player can select different lines.
            setTimeout(() => {
                if (!gameActive || questionAnswered) return;
                selectedBugLines.clear();
                const rows = $("challenge-code")?.querySelectorAll(".bb-debug-line") || [];
                rows.forEach(row => row.classList.remove("bb-selected-line","bb-correct-line","bb-wrong-line"));
                updateSelectionUI();
                clearResult();
                if (lives <= 0) {
                    endGame("GAME OVER");
                } else {
                    startTimer();
                }
            }, 900);
            updateStats();
        }
    }

    function handleTimeUp() {
        if (!gameActive || questionAnswered) return;
        stopTimer();
        lives--;
        streak = 0;
        updateLives();

        const q = questions[currentQuestion];
        const correctLines = getCorrectBugLines(q);
        revealAnswer(false, [], correctLines);

        if (lives <= 0) {
            endGame("TIME OUT");
            return;
        }

        if ($("result-message")) {
            $("result-message").textContent = `⌛ TIME UP — ${lives} LIVES LEFT`;
            $("result-message").className = "result-message error";
        }
        if ($("explanation")) $("explanation").textContent = getBugExplanation(q, correctLines);
        selectedBugLines.clear();
        updateSelectionUI();

        setTimeout(() => {
            if (gameActive) {
                clearResult();
                loadQuestion();
            }
        }, 1200);
    }

    function nextLevel() {
        if (!questionAnswered) return;

        if (currentQuestion >= questions.length - 1) {
            endGame("ALL LEVELS COMPLETE!");
            return;
        }

        currentQuestion++;
        users[currentUser].level = currentQuestion;
        saveProgress();
        loadQuestion();
    }

    function endGame(title) {
        stopTimer();
        gameActive = false;
        saveProgress();
        if ($("game-over-title")) $("game-over-title").textContent = title;
        if ($("final-score")) $("final-score").textContent = score;
        closeModal("pause-modal");
        openModal("game-over-modal");
    }

    function startGame(newGame = false) {
        closeModal("game-over-modal");
        closeModal("pause-modal");
        showScreen(true);
        gameActive = true;
        paused = false;
        streak = 0;

        if (newGame) {
            currentQuestion = 0;
            score = 0;
            lives = 3;
            bugsFound = 0;
            users[currentUser] = { score: 0, level: 0, bestScore };
            saveUsers();
        } else {
            lives = 3;
        }

        updateUserName();
        loadQuestion();
    }

    function mainMenu() {
        stopTimer();
        gameActive = false;
        paused = false;
        saveProgress();
        closeModal("pause-modal");
        closeModal("game-over-modal");
        showScreen(false);
        updateUserName();
    }

    function pauseGame() {
        if (!gameActive || questionAnswered) return;
        paused = true;
        stopTimer();
        openModal("pause-modal");
    }

    function resumeGame() {
        closeModal("pause-modal");
        if (!gameActive) return;
        paused = false;
        startTimer();
    }

    function restartGame() {
        closeModal("pause-modal");
        closeModal("game-over-modal");
        gameActive = true;
        currentQuestion = 0;
        score = 0;
        streak = 0;
        lives = 3;
        bugsFound = 0;
        saveProgress();
        loadQuestion();
    }

    function handleExit() {
        if (confirm("Exit BrainByte?")) {
            stopTimer();
            gameActive = false;
            try { window.close(); } catch {}
            if (!document.hidden) mainMenu();
        }
    }

    // Menu
    $("start-game-button")?.addEventListener("click", () => startGame(false));
    $("new-game-button")?.addEventListener("click", () => startGame(true));
    $("options-button")?.addEventListener("click", () => openModal("options-modal"));
    $("about-button")?.addEventListener("click", () => openModal("about-modal"));
    $("how-to-play-button")?.addEventListener("click", () => openModal("how-to-play-modal"));
    $("exit-button")?.addEventListener("click", handleExit);

    // Game
    $("check-button")?.addEventListener("click", checkAnswer);
    $("next-button")?.addEventListener("click", nextLevel);
    $("pause-button")?.addEventListener("click", pauseGame);
    $("quit-game-button")?.addEventListener("click", mainMenu);
    $("restart-game-button-inline")?.addEventListener("click", restartGame);
    $("restart-game-button")?.addEventListener("click", restartGame);
    $("resume-button")?.addEventListener("click", resumeGame);
    $("pause-quit-button")?.addEventListener("click", mainMenu);
    $("restart-button")?.addEventListener("click", restartGame);
    $("game-over-menu-button")?.addEventListener("click", mainMenu);

    // Modals
    $("close-options")?.addEventListener("click", () => closeModal("options-modal"));
    $("close-options-bottom")?.addEventListener("click", () => closeModal("options-modal"));
    $("close-about")?.addEventListener("click", () => closeModal("about-modal"));
    $("close-about-bottom")?.addEventListener("click", () => closeModal("about-modal"));
    $("close-how-to-play")?.addEventListener("click", () => closeModal("how-to-play-modal"));
    $("close-how-to-play-bottom")?.addEventListener("click", () => closeModal("how-to-play-modal"));

    $("timer-option")?.addEventListener("change", () => {
        if (!gameActive || questionAnswered) return;
        remainingTime = Number($("timer-option").value) || remainingTime;
        updateTimer();
    });

    // Escape closes informational modals / pause.
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        ["options-modal","about-modal","how-to-play-modal"].forEach(closeModal);
        if (gameActive && paused) resumeGame();
    });

    // Click backdrop to close simple modals.
    ["options-modal","about-modal","how-to-play-modal"].forEach(id => {
        $(id)?.addEventListener("click", e => {
            if (e.target === $(id)) closeModal(id);
        });
    });

    $("total-levels").textContent = questions.length;
    updateUserName();
    updateStats();
    updateLives();
    showScreen(false);
});
