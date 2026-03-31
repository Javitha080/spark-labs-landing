/**
 * ═══════════════════════════════════════════════════════════════
 *  YICDVP EASTER EGGS MODULE
 *  Hidden surprises for curious visitors & dev-minded people
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Console Greeting for Devs ──────────────────────────────

const LOGO_ART = `
%c██╗   ██╗██╗ ██████╗██████╗ ██╗   ██╗██████╗ 
╚██╗ ██╔╝██║██╔════╝██╔══██╗██║   ██║██╔══██╗
 ╚████╔╝ ██║██║     ██║  ██║██║   ██║██████╔╝
  ╚██╔╝  ██║██║     ██║  ██║╚██╗ ██╔╝██╔═══╝ 
   ██║   ██║╚██████╗██████╔╝ ╚████╔╝ ██║     
   ╚═╝   ╚═╝ ╚═════╝╚═════╝   ╚═══╝  ╚═╝     
`;

const WELCOME_MSG = `%c🚀 Hey there, curious one! You found the console.`;
const RECRUIT_MSG = `%c💡 We see you like to peek behind the curtain...\n   If you know your way around code, we want YOU!\n\n   🔧 Join the Young Innovators Club — we build robots,\n      IoT systems, solar-powered machines, and more.\n\n   🌐 Visit: https://dvpyic.dpdns.org/contact\n   📧 Drop us a line and mention you found this message!`;
const TEACHERS_MSG = `%c👨‍🏫 Are you a teacher? We're looking for STEM mentors!\n   Help us shape the next generation of innovators.\n   Reach out at: https://dvpyic.dpdns.org/contact`;
const EASTER_HINT = `%c🥚 Psst... there are more secrets hidden in this site.\n   Try the Konami Code (↑↑↓↓←→←→BA) for a surprise!\n   Or type "yicdvp" anywhere on the page...`;
const DIVIDER = `%c${"─".repeat(52)}`;

export function printConsoleGreeting() {
  // Skip in production if console is stripped, but this function
  // itself won't be stripped since we use console.log directly
  const styles = {
    logo: "color: #6366f1; font-weight: bold; font-size: 10px; font-family: monospace; line-height: 1.2;",
    welcome: "color: #22d3ee; font-weight: bold; font-size: 16px; padding: 8px 0;",
    recruit: "color: #a78bfa; font-size: 13px; line-height: 1.8; padding: 4px 0;",
    teachers: "color: #34d399; font-size: 13px; line-height: 1.8; padding: 4px 0;",
    easter: "color: #fbbf24; font-size: 12px; line-height: 1.8; padding: 4px 0; font-style: italic;",
    divider: "color: #374151; font-size: 10px;",
  };

  console.log(LOGO_ART, styles.logo);
  console.log(DIVIDER, styles.divider);
  console.log(WELCOME_MSG, styles.welcome);
  console.log(RECRUIT_MSG, styles.recruit);
  console.log(DIVIDER, styles.divider);
  console.log(TEACHERS_MSG, styles.teachers);
  console.log(DIVIDER, styles.divider);
  console.log(EASTER_HINT, styles.easter);
  console.log(DIVIDER, styles.divider);

  // Expose a secret global function
  (window as any).yicdvp = () => {
    console.log(
      "%c🎉 You called yicdvp()! You're definitely one of us.\n   Consider this your unofficial invitation to the club! 🚀",
      "color: #f472b6; font-size: 14px; font-weight: bold; line-height: 1.6;"
    );
    triggerConfetti();
  };

  // Also expose a secret help
  (window as any).secret = () => {
    console.log(
      "%c🔍 Secret Commands:\n" +
      "   • yicdvp()     — You know what to do\n" +
      "   • innovate()   — A quote for the curious\n" +
      "   • matrix()     — ███████████████\n",
      "color: #6ee7b7; font-size: 12px; line-height: 1.8;"
    );
  };

  (window as any).innovate = () => {
    const quotes = [
      '"The best way to predict the future is to invent it." — Alan Kay',
      '"Innovation distinguishes between a leader and a follower." — Steve Jobs',
      '"Every great developer you know got there by solving problems they were unqualified to solve." — Patrick McKenzie',
      '"The science of today is the technology of tomorrow." — Edward Teller',
      '"The only way to do great work is to love what you do." — Steve Jobs',
      '"First, solve the problem. Then, write the code." — John Johnson',
      '"Creativity is intelligence having fun." — Albert Einstein',
      '"The advance of technology is based on making it fit in so that you don\'t really even notice it." — Bill Gates',
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    console.log(`%c💭 ${quote}`, "color: #c4b5fd; font-size: 14px; font-style: italic; line-height: 1.6; padding: 8px 0;");
  };

  (window as any).matrix = () => {
    const chars = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ01234567890";
    let output = "";
    for (let i = 0; i < 20; i++) {
      let line = "";
      for (let j = 0; j < 60; j++) {
        line += chars[Math.floor(Math.random() * chars.length)];
      }
      output += line + "\n";
    }
    console.log(`%c${output}`, "color: #22c55e; font-family: monospace; font-size: 10px; line-height: 1.1;");
    console.log("%c🟢 Wake up, Neo... The YICDVP has you.", "color: #22c55e; font-size: 14px; font-weight: bold;");
  };
}

// ─── Konami Code Easter Egg ─────────────────────────────────

const KONAMI_SEQUENCE = [
  "ArrowUp", "ArrowUp",
  "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight",
  "ArrowLeft", "ArrowRight",
];

let konamiIndex = 0;

export function initKonamiCode() {
  const handler = (e: KeyboardEvent) => {
    const expected = KONAMI_SEQUENCE[konamiIndex];
    if (e.key === expected || e.key.toLowerCase() === expected) {
      konamiIndex++;
      if (konamiIndex === KONAMI_SEQUENCE.length) {
        konamiIndex = 0;
        onKonamiActivated();
      }
    } else {
      konamiIndex = 0;
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

function onKonamiActivated() {
  triggerConfetti();
  showToast("🎮 Konami Code Activated! You're a true gamer & innovator! 🚀");
}

// ─── Secret Word Detector ("yicdvp") ────────────────────────

let secretBuffer = "";
const SECRET_WORD = "yicdvp";

export function initSecretWordDetector() {
  const handler = (e: KeyboardEvent) => {
    // Skip if user is typing in an input/textarea
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    secretBuffer += e.key.toLowerCase();

    // Keep buffer short
    if (secretBuffer.length > 20) {
      secretBuffer = secretBuffer.slice(-20);
    }

    if (secretBuffer.includes(SECRET_WORD)) {
      secretBuffer = "";
      onSecretWordTyped();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

function onSecretWordTyped() {
  triggerGlitchEffect();
  showToast("⚡ YICDVP mode activated! You've unlocked innovator status!");
}

// ─── Visual Effects ─────────────────────────────────────────

function triggerConfetti() {
  const colors = ["#6366f1", "#22d3ee", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];
  const particleCount = 120;
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999999;overflow:hidden;";
  document.body.appendChild(container);

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 4;
    const isCircle = Math.random() > 0.5;
    const startX = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 200;
    const duration = Math.random() * 2 + 2;
    const delay = Math.random() * 0.5;
    const rotation = Math.random() * 720 - 360;

    particle.style.cssText = `
      position: absolute;
      top: -20px;
      left: ${startX}%;
      width: ${size}px;
      height: ${isCircle ? size : size * 0.6}px;
      background: ${color};
      border-radius: ${isCircle ? "50%" : "2px"};
      opacity: 1;
      animation: confetti-fall ${duration}s ease-in ${delay}s forwards;
    `;

    // Create unique keyframes for each particle
    const styleSheet = document.createElement("style");
    const animName = `confetti-fall`;
    if (!document.querySelector(`style[data-confetti]`)) {
      styleSheet.setAttribute("data-confetti", "true");
      styleSheet.textContent = `
        @keyframes confetti-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(${drift}px) rotate(${rotation}deg); opacity: 0; }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    container.appendChild(particle);
  }

  // Cleanup
  setTimeout(() => {
    container.remove();
  }, 4000);
}

function triggerGlitchEffect() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 999999;
    mix-blend-mode: difference;
  `;

  const glitchKeyframes = [
    { transform: "translate(0)" , background: "transparent" },
    { transform: "translate(-5px, 2px)", background: "rgba(255,0,0,0.05)" },
    { transform: "translate(3px, -3px)", background: "rgba(0,255,0,0.05)" },
    { transform: "translate(-2px, 4px)", background: "rgba(0,0,255,0.05)" },
    { transform: "translate(4px, -1px)", background: "rgba(255,0,255,0.05)" },
    { transform: "translate(0)", background: "transparent" },
  ];

  document.body.appendChild(overlay);

  overlay.animate(glitchKeyframes, {
    duration: 600,
    iterations: 3,
    easing: "steps(6)",
  }).onfinish = () => overlay.remove();

  // Also glitch the main heading if visible
  const h1 = document.querySelector("h1");
  if (h1) {
    h1.style.transition = "none";
    const originalText = h1.textContent || "";

    let flickerCount = 0;
    const flickerInterval = setInterval(() => {
      if (flickerCount >= 8) {
        clearInterval(flickerInterval);
        h1.textContent = originalText;
        h1.style.filter = "";
        return;
      }

      if (flickerCount % 2 === 0) {
        h1.style.filter = `hue-rotate(${Math.random() * 360}deg) saturate(3)`;
        // Scramble a few characters
        const chars = originalText.split("");
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * chars.length);
          chars[idx] = String.fromCharCode(33 + Math.floor(Math.random() * 93));
        }
        h1.textContent = chars.join("");
      } else {
        h1.style.filter = "";
        h1.textContent = originalText;
      }

      flickerCount++;
    }, 100);
  }
}

// ─── Toast Notification ─────────────────────────────────────

function showToast(message: string) {
  // Remove existing toast
  document.querySelector("[data-easter-toast]")?.remove();

  const toast = document.createElement("div");
  toast.setAttribute("data-easter-toast", "true");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95));
    color: white;
    padding: 16px 28px;
    border-radius: 16px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    z-index: 999999;
    box-shadow: 0 20px 60px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
    backdrop-filter: blur(20px);
    pointer-events: none;
    opacity: 0;
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 90vw;
    text-align: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(-50%) translateY(0)";
    toast.style.opacity = "1";
  });

  // Animate out
  setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ─── Footer Double-Click Secret ─────────────────────────────

export function initFooterSecret() {
  // Wait for DOM
  const check = () => {
    const copyrightEl = document.querySelector("footer p");
    if (copyrightEl) {
      let clickCount = 0;
      let clickTimer: ReturnType<typeof setTimeout>;

      copyrightEl.addEventListener("click", () => {
        clickCount++;
        clearTimeout(clickTimer);

        if (clickCount >= 3) {
          clickCount = 0;
          triggerConfetti();
          showToast("🎉 Triple click! You found the footer secret! You're hired! 😄");
        } else {
          clickTimer = setTimeout(() => {
            clickCount = 0;
          }, 600);
        }
      });
      return true;
    }
    return false;
  };

  // Try immediately, or wait for DOM updates
  if (!check()) {
    const observer = new MutationObserver(() => {
      if (check()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Safety cleanup
    setTimeout(() => observer.disconnect(), 10000);
  }
}

// ─── Init All Easter Eggs ───────────────────────────────────

export function initAllEasterEggs() {
  printConsoleGreeting();

  const cleanups: Array<() => void> = [];
  cleanups.push(initKonamiCode());
  cleanups.push(initSecretWordDetector());
  initFooterSecret();

  return () => cleanups.forEach((fn) => fn());
}
