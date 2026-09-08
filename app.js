/* مغامرة الأرقام - تطبيق تعليمي تفاعلي لتعلم العد والأعداد الزوجية والفردية */

/* ============================= الحالة العامة ============================= */

const STORAGE_KEY_STARS = "numbersApp.stars";
const STORAGE_KEY_MUTE = "numbersApp.muted";
const ROUNDS_PER_SESSION = 3;

const RANGE_BANDS = [{ min: 0, max: 10 }];
for (let start = 11; start <= 91; start += 10) {
  RANGE_BANDS.push({ min: start, max: start + 9 });
}

const state = {
  range: RANGE_BANDS[0],
  stars: Number(localStorage.getItem(STORAGE_KEY_STARS) || 0),
  muted: localStorage.getItem(STORAGE_KEY_MUTE) === "1",
};

const view = document.getElementById("view");
const homeBtn = document.getElementById("homeBtn");
const muteBtn = document.getElementById("muteBtn");
const starCountEl = document.getElementById("starCount");
const mascotEl = document.getElementById("mascot");
const mascotBubble = document.getElementById("mascotBubble");
const confettiLayer = document.getElementById("confettiLayer");

/* ============================= أدوات مساعدة عامة ============================= */

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      node.setAttribute(key, value);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function clearView() {
  view.innerHTML = "";
  document.body.querySelectorAll(":scope > .chip").forEach((stray) => stray.remove());
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueRandomSet(min, max, count) {
  const range = max - min + 1;
  const n = Math.min(count, range);
  const set = new Set();
  while (set.size < n) {
    set.add(randInt(min, max));
  }
  return shuffle([...set]);
}

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[d]);
}

function persistStars() {
  localStorage.setItem(STORAGE_KEY_STARS, String(state.stars));
  starCountEl.textContent = toArabicDigits(state.stars);
}

function persistMute() {
  localStorage.setItem(STORAGE_KEY_MUTE, state.muted ? "1" : "0");
  muteBtn.textContent = state.muted ? "🔇" : "🔊";
}

/* ============================= الصوت ============================= */

let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, duration, type = "sine", when = 0) {
  if (state.muted) return;
  try {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + when;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) {
    /* الصوت غير متاح - يتجاهل بصمت */
  }
}

function playClap(when = 0) {
  if (state.muted) return;
  try {
    const ctx = ensureAudio();
    const start = ctx.currentTime + when;
    const clapTimes = [0, 0.1, 0.2, 0.36];
    clapTimes.forEach((t) => {
      const duration = 0.09;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400 + Math.random() * 900;
      filter.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, start + t);
      gain.gain.exponentialRampToValueAtTime(0.001, start + t + duration);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(start + t);
      noise.stop(start + t + duration + 0.02);
    });
  } catch (e) {
    /* الصوت غير متاح - يتجاهل بصمت */
  }
}

function playSound(kind) {
  if (kind === "correct") {
    beep(880, 0.12);
    beep(1175, 0.15, "sine", 0.1);
  } else if (kind === "wrong") {
    beep(180, 0.25, "sawtooth");
  } else if (kind === "win") {
    [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.16, "sine", i * 0.12));
    playClap(0.2);
  } else if (kind === "good") {
    beep(659, 0.12);
    beep(880, 0.18, "sine", 0.1);
  } else if (kind === "click") {
    beep(440, 0.05);
  }
}

/* ============================= الموسيقى الخلفية ============================= */

const BG_MELODY = [
  [523.25, 0.3],
  [659.25, 0.3],
  [783.99, 0.3],
  [659.25, 0.3],
  [523.25, 0.3],
  [783.99, 0.3],
  [880.0, 0.45],
  [783.99, 0.3],
  [659.25, 0.3],
  [523.25, 0.45],
];

let musicPlaying = false;
let musicStep = 0;
let musicTimer = null;

function playMusicNote(freq, duration) {
  try {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.045, start + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) {
    /* الصوت غير متاح - يتجاهل بصمت */
  }
}

function scheduleNextNote() {
  if (!musicPlaying || state.muted) {
    musicTimer = null;
    return;
  }
  const [freq, duration] = BG_MELODY[musicStep % BG_MELODY.length];
  playMusicNote(freq, duration);
  musicStep++;
  musicTimer = setTimeout(scheduleNextNote, duration * 1000);
}

function startBackgroundMusic() {
  if (musicPlaying || state.muted) return;
  musicPlaying = true;
  scheduleNextNote();
}

function stopBackgroundMusic() {
  musicPlaying = false;
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

document.addEventListener(
  "pointerdown",
  () => {
    ensureAudio();
    startBackgroundMusic();
  },
  { once: true }
);

/* ============================= التميمة (البومة) ============================= */

const MASCOT_PHRASES = {
  correct: ["أحسنت! 🌟", "رائع جدًا!", "ممتاز!", "أنت بطل!", "إجابة صحيحة!"],
  wrong: ["حاول مرة أخرى!", "قريب جدًا، جرّب ثانية!", "لا بأس، حاول مجددًا!"],
  start: ["بالتوفيق يا صديقي!", "هيا بنا نبدأ!", "أنا هنا لمساعدتك!"],
};

let mascotTimer = null;
function sayMascot(kind) {
  const list = MASCOT_PHRASES[kind] || MASCOT_PHRASES.start;
  const text = list[randInt(0, list.length - 1)];
  mascotEl.hidden = false;
  mascotBubble.textContent = text;
  mascotBubble.classList.add("show");
  clearTimeout(mascotTimer);
  mascotTimer = setTimeout(() => mascotBubble.classList.remove("show"), 2200);
}

/* ============================= الاحتفال (Confetti) ============================= */

const CONFETTI_COLORS = ["#4fc3f7", "#ffca28", "#66bb6a", "#ff6b81", "#ab47bc"];
function triggerConfetti() {
  const count = 34;
  for (let i = 0; i < count; i++) {
    const piece = el("div", { class: "confetti-piece" });
    piece.style.left = randInt(0, 100) + "%";
    piece.style.background = CONFETTI_COLORS[randInt(0, CONFETTI_COLORS.length - 1)];
    piece.style.animationDuration = randInt(1800, 3200) + "ms";
    piece.style.animationDelay = randInt(0, 400) + "ms";
    confettiLayer.append(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

/* ============================= السحب والإفلات (Pointer Drag) ============================= */

function makeDraggable(chip, { dropZoneSelector, onDrop }) {
  chip.addEventListener("pointerdown", startDrag);

  function startDrag(e) {
    if (chip.classList.contains("correct-lock")) return;
    e.preventDefault();
    const rect = chip.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const originalParent = chip.parentElement;
    const originalNext = chip.nextSibling;

    chip.setPointerCapture(e.pointerId);
    chip.classList.add("dragging");
    document.body.append(chip);
    chip.style.position = "fixed";
    chip.style.zIndex = 1000;
    chip.style.width = rect.width + "px";
    chip.style.left = rect.left + "px";
    chip.style.top = rect.top + "px";

    let lastZone = null;
    let settled = false;

    function move(ev) {
      chip.style.left = ev.clientX - offsetX + "px";
      chip.style.top = ev.clientY - offsetY + "px";
      chip.style.pointerEvents = "none";
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      chip.style.pointerEvents = "";
      const zone = under ? under.closest(dropZoneSelector) : null;
      if (zone !== lastZone) {
        if (lastZone) lastZone.classList.remove("drag-over");
        if (zone) zone.classList.add("drag-over");
        lastZone = zone;
      }
    }

    const revert = () => {
      if (originalNext) originalParent.insertBefore(chip, originalNext);
      else originalParent.append(chip);
    };

    function finish(ev, cancelled) {
      if (settled) return;
      settled = true;
      try {
        chip.releasePointerCapture(ev.pointerId);
      } catch (e) {
        /* قد يكون المؤشر قد فُقد بالفعل - يتجاهل بصمت */
      }
      chip.removeEventListener("pointermove", move);
      chip.removeEventListener("pointerup", up);
      chip.removeEventListener("pointercancel", cancel);
      chip.classList.remove("dragging");
      chip.style.position = "";
      chip.style.zIndex = "";
      chip.style.width = "";
      chip.style.left = "";
      chip.style.top = "";
      if (lastZone) lastZone.classList.remove("drag-over");

      if (cancelled) {
        revert();
        return;
      }

      chip.style.pointerEvents = "none";
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      chip.style.pointerEvents = "";
      const zone = under ? under.closest(dropZoneSelector) : null;
      onDrop(zone, chip, { revert, originalParent });
    }

    function up(ev) {
      finish(ev, false);
    }
    function cancel(ev) {
      finish(ev, true);
    }

    chip.addEventListener("pointermove", move);
    chip.addEventListener("pointerup", up);
    chip.addEventListener("pointercancel", cancel);
  }
}

/* ============================= رأس الجولة المشترك ============================= */

function buildRoundHeader({ icon, title, round, total, range }) {
  const dots = [];
  for (let i = 1; i <= total; i++) {
    const cls = i < round ? "progress-dot done" : i === round ? "progress-dot current" : "progress-dot";
    dots.push(el("span", { class: cls }));
  }
  return el(
    "div",
    { class: "round-header" },
    el("div", { class: "round-title" }, icon + " " + title),
    el("div", { class: "range-chip" }, `🔢 ${toArabicDigits(range.min)} إلى ${toArabicDigits(range.max)}`),
    el("div", { class: "progress-dots" }, ...dots)
  );
}

/* ============================= مشغّل الجلسة العام ============================= */

let sessionEpoch = 0;

function runSession(config) {
  sessionEpoch++;
  const myEpoch = sessionEpoch;
  const { icon, title, generate, renderRound } = config;
  const range = state.range;
  let round = 0;
  let totalMistakes = 0;
  let perfectRounds = 0;

  function next() {
    if (myEpoch !== sessionEpoch) return;
    round++;
    if (round > ROUNDS_PER_SESSION) {
      renderSummary(config, totalMistakes, perfectRounds);
      return;
    }
    const data = generate(range.min, range.max);
    clearView();
    renderRound({
      data,
      header: buildRoundHeader({ icon, title, round, total: ROUNDS_PER_SESSION, range }),
      onRoundDone: (mistakesInRound) => {
        totalMistakes += mistakesInRound;
        if (mistakesInRound === 0) perfectRounds++;
        setTimeout(next, 900);
      },
    });
  }

  sayMascot("start");
  next();
}

function renderSummary(config, mistakes, perfectRounds) {
  const starsEarned = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
  state.stars += starsEarned;
  persistStars();
  clearView();

  const perfect = mistakes === 0;
  view.append(
    el(
      "div",
      { class: "summary-card" },
      el("div", { class: "summary-emoji" }, perfect ? "🏆" : "🎉"),
      el("h2", {}, "أحسنت! أكملت التمرين"),
      el(
        "div",
        { class: "score-badge" },
        el("span", { class: "score-label" }, "درجتك"),
        el(
          "span",
          { class: "score-value" },
          `${toArabicDigits(perfectRounds)} من ${toArabicDigits(ROUNDS_PER_SESSION)}`
        )
      ),
      el("div", { class: "stars-earned" }, "⭐".repeat(starsEarned) + "☆".repeat(3 - starsEarned)),
      el(
        "p",
        {},
        perfect ? "إجابات مثالية بلا أي خطأ! أنت نجم حقيقي! 🌟" : "عمل رائع! استمر في التدريب لتصبح محترفًا 💪"
      ),
      el(
        "div",
        { class: "summary-actions" },
        el("button", { class: "btn btn-primary", onClick: () => runSession(config) }, "🔁 جولة أخرى"),
        el("button", { class: "btn btn-secondary", onClick: renderHome }, "🏠 القائمة الرئيسية")
      )
    )
  );

  triggerConfetti();
  playSound(perfect ? "win" : "good");
  homeBtn.hidden = false;
}

/* ============================= اللعبة ١: ترتيب الأعداد ============================= */

function generateOrderRound(min, max) {
  const direction = Math.random() < 0.5 ? "asc" : "desc";
  const count = 5;
  const numbers = uniqueRandomSet(min, max, count);
  const correctOrder = [...numbers].sort((a, b) => (direction === "asc" ? a - b : b - a));
  return { direction, pool: shuffle(numbers), correctOrder, count };
}

function renderOrderRound({ data, header, onRoundDone }) {
  let mistakes = 0;
  const dirLabel = data.direction === "asc" ? "تصاعديًا ⬆️" : "تنازليًا ⬇️";
  const banner = el("div", { class: "instruction-banner" }, `اسحب الأرقام ورتّبها ${dirLabel}`);

  const poolArea = el("div", { class: "pool-area chip-row" });
  const slotRow = el("div", { class: "slot-row chip-row" });
  const slots = [];

  for (let i = 0; i < data.count; i++) {
    const slot = el("div", { class: "slot" }, "؟");
    slots.push(slot);
    slotRow.append(slot);
  }

  data.pool.forEach((value) => {
    const chip = buildChip(value);
    poolArea.append(chip);
    attachOrderDrag(chip);
  });

  const checkBtn = el(
    "button",
    { class: "btn btn-primary", disabled: true, onClick: checkOrder },
    "✅ تحقق"
  );

  function attachOrderDrag(chip) {
    makeDraggable(chip, {
      dropZoneSelector: ".slot, .pool-area",
      onDrop: (zone, dragged, { revert, originalParent }) => {
        if (!zone) {
          revert();
          return;
        }
        if (zone.classList.contains("pool-area")) {
          zone.textContent === "" && null;
          zone.append(dragged);
          refreshCheckState();
          return;
        }
        if (zone.classList.contains("slot")) {
          const existingChip = zone.querySelector(".chip");
          if (existingChip && existingChip !== dragged) {
            poolArea.append(existingChip);
          }
          if (zone.firstChild && zone.firstChild.nodeType === Node.TEXT_NODE) {
            zone.textContent = "";
          }
          zone.classList.add("filled");
          zone.append(dragged);
          refreshCheckState();
        }
      },
    });
  }

  function refreshCheckState() {
    const allFilled = slots.every((s) => s.querySelector(".chip"));
    checkBtn.disabled = !allFilled;
    slots.forEach((s) => s.classList.remove("wrong-flash", "correct-flash"));
  }

  function checkOrder() {
    const current = slots.map((s) => Number(s.querySelector(".chip").dataset.value));
    const isCorrect = current.every((v, i) => v === data.correctOrder[i]);
    if (isCorrect) {
      slots.forEach((s) => {
        s.classList.add("correct-flash");
        s.querySelector(".chip").classList.add("correct-lock");
      });
      checkBtn.disabled = true;
      playSound("win");
      sayMascot("correct");
      onRoundDone(mistakes);
    } else {
      mistakes++;
      playSound("wrong");
      sayMascot("wrong");
      slots.forEach((s, i) => {
        const chipVal = Number(s.querySelector(".chip").dataset.value);
        if (chipVal !== data.correctOrder[i]) {
          s.classList.add("wrong-flash");
        }
      });
    }
  }

  view.append(
    header,
    banner,
    el(
      "div",
      { class: "game-card" },
      el("div", { class: "pool-row" }, poolArea),
      slotRow,
      el("div", { class: "actions-row" }, checkBtn)
    )
  );
}

function buildChip(value) {
  const chip = el("div", { class: "chip pop-in" }, toArabicDigits(value));
  chip.dataset.value = String(value);
  return chip;
}

/* ============================= اللعبة ٢: أكمل التسلسل ============================= */

function generateSequenceRound(min, max) {
  const direction = Math.random() < 0.5 ? "asc" : "desc";
  const length = 6;
  const maxStart = Math.max(min, max - length + 1);
  const start = randInt(min, maxStart);
  let seq = Array.from({ length }, (_, i) => start + i);
  if (direction === "desc") seq = seq.slice().reverse();

  const blanksCount = Math.random() < 0.5 ? 2 : 3;
  const indices = shuffle([...Array(length).keys()]).slice(0, blanksCount).sort((a, b) => a - b);

  return { direction, seq, blankIndices: indices };
}

function renderSequenceRound({ data, header, onRoundDone }) {
  let mistakes = 0;
  const dirLabel = data.direction === "asc" ? "تصاعديًا ⬆️" : "تنازليًا ⬇️";
  const banner = el("div", { class: "instruction-banner" }, `أكمل الأرقام الناقصة في السلسلة (${dirLabel})`);

  const seqRow = el("div", { class: "chip-row sequence-row" });
  const blanks = [];
  let activeBlank = null;

  data.seq.forEach((value, i) => {
    if (data.blankIndices.includes(i)) {
      const box = el("div", { class: "seq-box blank" }, "؟");
      box.dataset.answer = String(value);
      box.dataset.buffer = "";
      box.addEventListener("click", () => setActive(box));
      blanks.push(box);
      seqRow.append(box);
    } else {
      seqRow.append(el("div", { class: "seq-box given" }, toArabicDigits(value)));
    }
  });

  function setActive(box) {
    if (box.classList.contains("correct")) return;
    if (activeBlank) activeBlank.classList.remove("active");
    activeBlank = box;
    box.classList.add("active");
  }

  function typeDigit(d) {
    if (!activeBlank) return;
    const next = (activeBlank.dataset.buffer + d).slice(-3);
    activeBlank.dataset.buffer = next;
    activeBlank.textContent = toArabicDigits(next);
    playSound("click");
    refreshCheckState();
  }

  function backspace() {
    if (!activeBlank) return;
    const next = activeBlank.dataset.buffer.slice(0, -1);
    activeBlank.dataset.buffer = next;
    activeBlank.textContent = next === "" ? "؟" : toArabicDigits(next);
    refreshCheckState();
  }

  function refreshCheckState() {
    const allFilled = blanks.every((b) => b.dataset.buffer !== "");
    checkBtn.disabled = !allFilled;
  }

  const keys = [];
  for (let d = 0; d <= 9; d++) {
    keys.push(el("button", { class: "key-btn", onClick: () => typeDigit(String(d)) }, toArabicDigits(d)));
  }
  keys.push(el("button", { class: "key-btn key-back", onClick: backspace }, "⌫"));

  const checkBtn = el("button", { class: "btn btn-primary", disabled: true, onClick: checkAnswers }, "✅ تحقق");

  function checkAnswers() {
    let allCorrect = true;
    let wrongCount = 0;
    blanks.forEach((b) => {
      const val = b.dataset.buffer;
      if (val === b.dataset.answer) {
        b.classList.remove("wrong");
        b.classList.add("correct");
        b.textContent = toArabicDigits(val);
      } else {
        allCorrect = false;
        wrongCount++;
        b.classList.remove("correct");
        b.classList.add("wrong");
      }
    });
    if (allCorrect) {
      checkBtn.disabled = true;
      playSound("win");
      sayMascot("correct");
      onRoundDone(mistakes);
    } else {
      mistakes += wrongCount;
      playSound("wrong");
      sayMascot("wrong");
      setTimeout(() => {
        blanks.forEach((b) => {
          if (!b.classList.contains("correct")) {
            b.dataset.buffer = "";
            b.textContent = "؟";
            b.classList.remove("wrong");
          }
        });
        refreshCheckState();
      }, 700);
    }
  }

  function onKeydown(e) {
    if (e.key >= "0" && e.key <= "9") typeDigit(e.key);
    else if (e.key === "Backspace") backspace();
    else if (e.key === "Enter" && !checkBtn.disabled) checkAnswers();
  }
  document.addEventListener("keydown", onKeydown);
  cleanupHooks.push(() => document.removeEventListener("keydown", onKeydown));

  if (blanks[0]) setActive(blanks[0]);

  view.append(
    header,
    banner,
    el(
      "div",
      { class: "game-card" },
      seqRow,
      el("div", { class: "keypad" }, ...keys),
      el("div", { class: "actions-row" }, checkBtn)
    )
  );
}

/* ============================= اللعبة ٣: زوجي أم فردي ============================= */

function generateOddEvenRound(min, max) {
  const count = Math.min(6, max - min + 1);
  const numbers = uniqueRandomSet(min, max, count);
  return { numbers };
}

function renderOddEvenRound({ data, header, onRoundDone }) {
  let mistakes = 0;
  let remaining = data.numbers.length;
  const banner = el("div", { class: "instruction-banner" }, "اسحب كل رقم إلى السلة الصحيحة 🧺");

  const poolArea = el("div", { class: "pool-area chip-row" });
  const evenChips = el("div", { class: "basket-chips" });
  const oddChips = el("div", { class: "basket-chips" });

  const evenZone = el(
    "div",
    { class: "basket-zone basket-even" },
    el("div", { class: "basket-label" }, "🟢 زوجي"),
    evenChips
  );
  const oddZone = el(
    "div",
    { class: "basket-zone basket-odd" },
    el("div", { class: "basket-label" }, "🔵 فردي"),
    oddChips
  );

  data.numbers.forEach((value) => {
    const chip = buildChip(value);
    poolArea.append(chip);
    attachSortDrag(chip);
  });

  function attachSortDrag(chip) {
    makeDraggable(chip, {
      dropZoneSelector: ".basket-zone, .pool-area",
      onDrop: (zone, dragged, { revert }) => {
        if (!zone || zone.classList.contains("pool-area")) {
          revert();
          return;
        }
        const value = Number(dragged.dataset.value);
        const isEven = value % 2 === 0;
        const wantsEven = zone.classList.contains("basket-even");
        if (isEven === wantsEven) {
          dragged.classList.add("correct-lock");
          (wantsEven ? evenChips : oddChips).append(dragged);
          playSound("correct");
          sayMascot("correct");
          remaining--;
          if (remaining === 0) {
            playSound("win");
            onRoundDone(mistakes);
          }
        } else {
          mistakes++;
          dragged.classList.add("shake");
          setTimeout(() => dragged.classList.remove("shake"), 500);
          playSound("wrong");
          sayMascot("wrong");
          revert();
        }
      },
    });
  }

  view.append(
    header,
    banner,
    el(
      "div",
      { class: "game-card" },
      el("div", { class: "pool-row" }, poolArea),
      el("div", { class: "baskets-row" }, evenZone, oddZone)
    )
  );
}

/* ============================= الشاشة الرئيسية ============================= */

let cleanupHooks = [];
function runCleanupHooks() {
  cleanupHooks.forEach((fn) => fn());
  cleanupHooks = [];
}

function buildRangeSelector() {
  const wrap = el(
    "div",
    { class: "range-selector-wrap" },
    el("div", { class: "range-selector" }, el("span", { class: "range-label" }, "🎯 نطاق الأعداد:"))
  );
  const bandsRow = wrap.firstChild;
  const buttons = RANGE_BANDS.map((band) => {
    const btn = el(
      "button",
      {
        class: "range-btn" + (state.range === band ? " active" : ""),
        onClick: () => {
          state.range = band;
          buttons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          playSound("click");
        },
      },
      `${toArabicDigits(band.min)} إلى ${toArabicDigits(band.max)}`
    );
    return btn;
  });
  buttons.forEach((b) => bandsRow.append(b));
  wrap.append(el("p", { class: "range-hint" }, "اختر النطاق أولًا، ثم اضغط على أحد التمارين بالأسفل ⬇️"));
  return wrap;
}

function buildMenuCard(emoji, title, desc, onClick) {
  return el(
    "button",
    { class: "menu-card", onClick },
    el("div", { class: "menu-card-emoji" }, emoji),
    el("div", { class: "menu-card-title" }, title),
    el("div", { class: "menu-card-desc" }, desc)
  );
}

function renderHome() {
  sessionEpoch++;
  runCleanupHooks();
  clearView();
  homeBtn.hidden = true;

  const title = el("h1", { class: "app-title" }, "🦉 مغامرة الأرقام");
  const subtitle = el("p", { class: "app-subtitle" }, "تعلّم العدّ والأرقام الزوجية والفردية بطريقة ممتعة!");
  const rangeSection = buildRangeSelector();

  const grid = el(
    "div",
    { class: "menu-grid" },
    buildMenuCard("🔢", "ترتيب الأعداد", "رتّب الأرقام تصاعديًا أو تنازليًا", () => startOrderGame()),
    buildMenuCard("🧩", "أكمل التسلسل", "أكمل الأرقام الناقصة في السلسلة", () => startSequenceGame()),
    buildMenuCard("🎈", "زوجي أم فردي", "اسحب كل رقم إلى السلة الصحيحة", () => startOddEvenGame())
  );

  view.append(title, subtitle, rangeSection, grid);
  mascotEl.hidden = true;
}

function startOrderGame() {
  homeBtn.hidden = false;
  runSession({
    icon: "🔢",
    title: "ترتيب الأعداد",
    generate: generateOrderRound,
    renderRound: renderOrderRound,
  });
}

function startSequenceGame() {
  homeBtn.hidden = false;
  runSession({
    icon: "🧩",
    title: "أكمل التسلسل",
    generate: generateSequenceRound,
    renderRound: renderSequenceRound,
  });
}

function startOddEvenGame() {
  homeBtn.hidden = false;
  runSession({
    icon: "🎈",
    title: "زوجي أم فردي",
    generate: generateOddEvenRound,
    renderRound: renderOddEvenRound,
  });
}

/* ============================= أحداث الرأس ============================= */

homeBtn.addEventListener("click", () => {
  runCleanupHooks();
  renderHome();
});

muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  persistMute();
  if (state.muted) {
    stopBackgroundMusic();
  } else {
    playSound("click");
    startBackgroundMusic();
  }
});

/* ============================= بدء التشغيل ============================= */

persistStars();
persistMute();
renderHome();
