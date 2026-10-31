const cube = document.getElementById("pumpkin");
const front = document.querySelector(".front");
const countdown = document.getElementById("countdown");

let ending = false;
let targetX = 0;
let targetY = 0;

let currentX = 0;
let currentY = 0;

document.addEventListener("pointermove", (event) => {
    const mouseX = event.clientX / window.innerWidth;
    const mouseY = event.clientY / window.innerHeight;

    targetX = (mouseX - 0.5) * 35;
    targetY = -(mouseY - 0.5) * 35;
});

function animatePumpkin(now = 0) {
    if (ending) { targetX = 0; targetY = 0; }   // turn to face you for the finale

    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;

    // slow idle sway so the pumpkin feels alive even when the mouse is still
    const idle = ending ? 0 : 1;
    const swayY = Math.sin(now / 1800) * 4 * idle;
    const swayX = Math.cos(now / 2300) * 3 * idle;

    cube.style.transform = `rotateX(${currentY + swayX}deg) rotateY(${currentX + swayY}deg)`;

    requestAnimationFrame(animatePumpkin);
}

animatePumpkin();

document.addEventListener("click", () => {
    if (ending) return;
    /* Pumpkin glow */
    front.classList.remove("glowing");
    void front.offsetWidth;
    front.classList.add("glowing");
    setTimeout(() => front.classList.remove("glowing"), 950);

    /* Glow EVERY orange countdown outline */
    countdown.classList.remove("glowing");
    void countdown.offsetWidth;
    countdown.classList.add("glowing");
});

function createDigit(value) {
    const digit = document.createElement("div");
    digit.className = "digit";
    digit.textContent = value;
    digit.dataset.value = value;
    return digit;
}

function createNumber(value, key) {
    const wrapper = document.createElement("div");
    wrapper.className = "number-group";
    wrapper.dataset.key = key;

    const digits = String(value).padStart(2, "0");

    wrapper.appendChild(createDigit(digits[0]));
    wrapper.appendChild(createDigit(digits[1]));

    return wrapper;
}

function createSeparator() {
    const separator = document.createElement("div");
    separator.className = "separator";
    separator.textContent = ":";
    return separator;
}

/**
 * Target Time Calculation: 10:00 PM GMT (22:00 UTC)
 */
function getTargetTime() {
    // index.html?test=10 -> counts down 10 seconds so you can preview the ending
    const test = Number(new URLSearchParams(location.search).get("test"));
    if (test > 0) return new Date(Date.now() + test * 1000);

    return new Date(Date.UTC(2026, 9, 31, 22, 0, 0));   // 10:00 PM GMT
}

const targetTime = getTargetTime();
const alreadyOver = targetTime - Date.now() <= 0;

/**
 * Ending sequence (about 7s). It also plays when the page is opened after the
 * countdown is over, after a short pause so the empty board is seen first.
 *  ending  -> pumpkin rumbles, ignites and turns to face you
 *  ending2 -> the rumble doubles, the room glows orange
 *  burst   -> white-hot flash, shockwaves, the cube explodes into embers
 *  fade    -> the embers cool to pale blue and the light settles into theend.html
 */
function beginEnding() {
    if (ending) return;
    ending = true;

    const classes = document.body.classList;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lead = alreadyOver ? 1500 : 0;
    const steps = reduce
        ? [[0, "fade"], [1400, null]]
        : [[0, "ending"], [1700, "ending2"], [3200, "burst"], [4300, "fade"], [7000, null]];

    steps.forEach(([ms, cls]) => setTimeout(() => {
        if (!cls) { location.href = "theend.html"; return; }
        classes.add(cls);
        if (cls === "burst") sparkBurst();
    }, lead + ms));
}

/** Embers explode from the pumpkin, then cool from orange to the pale blue of the end page. */
function sparkBurst() {
    const cv = document.createElement("canvas");
    cv.className = "fade-layer";
    cv.style.cssText = "z-index:9;opacity:1";
    document.body.appendChild(cv);

    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    const g = cv.getContext("2d"), born = performance.now();
    const sparks = Array.from({ length: 280 }, () => {
        const a = Math.random() * 6.283, v = (200 + Math.random() * 1200) * dpr;
        return { x: W / 2, y: H / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                 r: (1 + Math.random() * 3) * dpr, life: 1.8 + Math.random() * 2.6 };
    });
    let last = born;

    (function tick(now) {
        const dt = Math.min(0.05, (now - last) / 1000), age = (now - born) / 1000;
        last = now;
        g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = "lighter";
        const cold = Math.min(1, Math.max(0, (age - 0.8) / 2.2));
        const rgb = `${255 - 80 * cold | 0},${150 + 50 * cold | 0},${40 + 195 * cold | 0}`;
        const drag = Math.pow(0.12, dt);

        sparks.forEach(p => {
            p.vx *= drag;
            p.vy = p.vy * drag - 40 * dpr * dt;      // embers drift upward as they slow
            p.x += p.vx * dt; p.y += p.vy * dt;
            const a = 1 - age / p.life;
            if (a <= 0) return;
            g.fillStyle = `rgba(${rgb},${a * 0.18})`;
            g.beginPath(); g.arc(p.x, p.y, p.r * 3.5, 0, 6.283); g.fill();
            g.fillStyle = `rgba(${rgb},${a})`;
            g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
        });

        if (age < 5.2) requestAnimationFrame(tick);
        else cv.remove();
    })(born);
}

function getCountdown() {
    const now = new Date();
    const difference = targetTime - now;

    // final minute: the room starts to pulse
    if (difference > 0 && difference < 60000) document.body.classList.add("dread");

    if (difference <= 0) {
        beginEnding();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
    };
}

function createBoard() {
    countdown.innerHTML = "";

    const days = createNumber(0, "days");
    const hours = createNumber(0, "hours");
    const minutes = createNumber(0, "minutes");
    const seconds = createNumber(0, "seconds");

    countdown.appendChild(days);
    countdown.appendChild(createSeparator());
    countdown.appendChild(hours);
    countdown.appendChild(createSeparator());
    countdown.appendChild(minutes);
    countdown.appendChild(createSeparator());
    countdown.appendChild(seconds);

    addLabel(days, "DAYS");
    addLabel(hours, "HOURS");
    addLabel(minutes, "MINUTES");
    addLabel(seconds, "SECONDS");
}

function addLabel(group, text) {
    const label = document.createElement("div");
    label.className = "unit-label";
    label.textContent = text;
    group.appendChild(label);
}

function updateDigit(element, newValue) {
    if (element.dataset.value === newValue) {
        return;
    }

    const oldDigit = element.dataset.value || element.textContent;
    element.dataset.value = newValue;

    const newDigit = document.createElement("span");
    newDigit.className = "digit-value new-value";
    newDigit.textContent = newValue;

    const oldValue = document.createElement("span");
    oldValue.className = "digit-value old-value";
    oldValue.textContent = oldDigit;

    element.innerHTML = "";
    element.appendChild(oldValue);
    element.appendChild(newDigit);

    requestAnimationFrame(() => {
        element.classList.add("changing");
    });

    setTimeout(() => {
        element.classList.remove("changing");
        element.innerHTML = newValue;
        element.dataset.value = newValue;
    }, 450);
}

function updateCountdown() {
    const time = getCountdown();

    const values = [
        String(time.days).padStart(2, "0"),
        String(time.hours).padStart(2, "0"),
        String(time.minutes).padStart(2, "0"),
        String(time.seconds).padStart(2, "0")
    ];

    const groups = countdown.querySelectorAll(".number-group");

    groups.forEach((group, groupIndex) => {
        const digits = group.querySelectorAll(".digit");
        const value = values[groupIndex];

        digits.forEach((digit, digitIndex) => {
            updateDigit(digit, value[digitIndex]);
        });
    });
}

createBoard();

const initialTime = getCountdown();

const initialValues = [
    String(initialTime.days).padStart(2, "0"),
    String(initialTime.hours).padStart(2, "0"),
    String(initialTime.minutes).padStart(2, "0"),
    String(initialTime.seconds).padStart(2, "0")
];

const initialGroups = countdown.querySelectorAll(".number-group");

initialGroups.forEach((group, groupIndex) => {
    const digits = group.querySelectorAll(".digit");

    digits.forEach((digit, digitIndex) => {
        const val = initialValues[groupIndex][digitIndex];
        digit.textContent = val;
        digit.dataset.value = val;
    });
});

setInterval(updateCountdown, 1000);

/** Ash drifts down, a few embers climb. Both thicken as the countdown runs out. */
(function ash() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:2;pointer-events:none";
    document.body.appendChild(cv);
    const g = cv.getContext("2d");
    let W, H;
    const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    fit();
    addEventListener("resize", fit);

    const make = (anywhere) => {
        const ember = Math.random() < 0.12;
        return {
            x: Math.random() * W,
            y: anywhere ? Math.random() * H : (ember ? H + 10 : -10),
            r: 0.6 + Math.random() * 1.8,
            v: ember ? -(15 + Math.random() * 25) : 12 + Math.random() * 30,
            drift: (Math.random() - 0.5) * 14,
            ember,
            p: Math.random() * 6.28
        };
    };
    const bits = Array.from({ length: 120 }, () => make(true));
    let last = performance.now();

    (function tick(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = "lighter";
        const wild = document.body.classList.contains("dread") ? 2.2 : 1;

        bits.forEach((b, i) => {
            b.y += b.v * wild * dt;
            b.x += (b.drift + Math.sin(now / 1400 + b.p) * 10) * dt;
            if (b.y > H + 12 || b.y < -12 || b.x < -12 || b.x > W + 12) bits[i] = make(false);
            if (b.ember) {
                const a = 0.5 + 0.5 * Math.sin(now / 300 + b.p);
                g.fillStyle = `rgba(255,70,20,${a * 0.15})`;
                g.beginPath(); g.arc(b.x, b.y, b.r * 4, 0, 6.283); g.fill();
                g.fillStyle = `rgba(255,110,40,${0.4 + a * 0.5})`;
            } else {
                g.fillStyle = "rgba(165,158,158,0.3)";
            }
            g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill();
        });
        requestAnimationFrame(tick);
    })(last);
})();