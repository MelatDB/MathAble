/**
 * Voice command definitions for MathAble.
 *
 * PHILOSOPHY
 * ──────────
 * Every action a sighted user can do with a mouse or keyboard must have a
 * voice equivalent.  Commands are grouped by domain and ordered most-specific
 * first to avoid false matches.
 *
 * Math voice input (dictation into the solver/practice answer box) is handled
 * by useVoiceInput and is kept completely separate from these navigation
 * commands.  looksLikeMath() is the guard that separates the two.
 */

export const COMMANDS = [
  // ── Page navigation ──────────────────────────────────────────────────
  { patterns: [/\b(go\s+to\s+dashboard|open\s+dashboard|dashboard)\b/i],
    action: "NAV_DASHBOARD", confirm: "Opening Dashboard." },

  { patterns: [/\b(open\s+math\s+solver|go\s+to\s+solver|math\s+solver|solver)\b/i,
               /\bsolve\s+math\b/i],
    action: "NAV_SOLVE", confirm: "Opening Math Solver." },

  { patterns: [/\b(open\s+practice|go\s+to\s+practice|practice\s+page)\b/i, /^practice$/i],
    action: "NAV_PRACTICE", confirm: "Opening Practice." },

  { patterns: [/\b(open\s+progress|go\s+to\s+progress|my\s+progress|progress\s+page)\b/i, /^progress$/i],
    action: "NAV_PROGRESS", confirm: "Opening Progress." },

  { patterns: [/\b(open\s+my\s+solutions|my\s+solutions|solution\s+history|solutions\s+page)\b/i, /^solutions$/i],
    action: "NAV_STORY", confirm: "Opening My Solutions." },

  { patterns: [/\b(open\s+settings|go\s+to\s+settings|settings\s+page)\b/i, /^settings$/i],
    action: "NAV_SETTINGS", confirm: "Opening Settings." },

  { patterns: [/\b(open\s+help|go\s+to\s+help|help\s+page)\b/i, /^help$/i],
    action: "NAV_HELP", confirm: "Opening Help." },

  { patterns: [/\b(go\s+back|back)\b/i],
    action: "NAV_BACK", confirm: "Going back." },

  { patterns: [/\b(go\s+home|home)\b/i],
    action: "NAV_HOME", confirm: "Going to Dashboard." },

  // ── Auth navigation ──────────────────────────────────────────────────
  { patterns: [/\b(go\s+to\s+login|open\s+login|log\s+in\s+page|sign\s+in\s+page)\b/i,
               /^(login|log\s+in|sign\s+in)$/i],
    action: "NAV_LOGIN", confirm: "Opening Sign In page." },

  { patterns: [/\b(go\s+to\s+register|create\s+account|register\s+page|sign\s+up)\b/i,
               /^register$/i],
    action: "NAV_REGISTER", confirm: "Opening Create Account page." },

  // ── Teacher navigation ───────────────────────────────────────────────
  { patterns: [/\b(open\s+teacher\s+dashboard|teacher\s+dashboard|teacher\s+home)\b/i],
    action: "NAV_TEACHER", confirm: "Opening Teacher Dashboard." },

  { patterns: [/\b(open\s+students|view\s+students|show\s+students|students)\b/i],
    action: "NAV_TEACHER_STUDENTS", confirm: "Opening Students." },

  { patterns: [/\b(open\s+assignments|view\s+assignments|assignments)\b/i],
    action: "NAV_TEACHER_ASSIGNMENTS", confirm: "Opening Assignments." },

  // ── TTS / reading ────────────────────────────────────────────────────
  { patterns: [/\bread\s+(the\s+)?solution\b/i, /\blisten\s+to\s+(the\s+)?solution\b/i],
    action: "READ_SOLUTION", confirm: "Reading solution." },

  { patterns: [/\bread\s+(the\s+)?question\b/i, /\blisten\s+to\s+(the\s+)?question\b/i],
    action: "READ_QUESTION", confirm: "Reading question." },

  { patterns: [/\bread\s+(the\s+)?explanation\b/i, /\blisten\s+to\s+(the\s+)?explanation\b/i],
    action: "READ_EXPLANATION", confirm: "Reading explanation." },

  { patterns: [/\bread\s+(the\s+)?page\b/i, /\bread\s+all\b/i],
    action: "READ_PAGE", confirm: "Reading page." },

  { patterns: [/\b(stop\s+reading|stop\s+speaking|stop\s+narration|stop\s+audio)\b/i],
    action: "STOP_TTS", confirm: "" },

  // ── Practice actions ─────────────────────────────────────────────────
  { patterns: [/\b(next\s+question|next)\b/i],
    action: "NEXT", confirm: "Moving to next question." },

  { patterns: [/\b(previous\s+question|previous|prev)\b/i],
    action: "PREV", confirm: "Moving to previous." },

  // "answer 5" / "my answer is 5" / "answer is x equals 3" — captures text after keyword
  { patterns: [/^answer\s+(.+)$/i, /^my\s+answer\s+is\s+(.+)$/i, /^the\s+answer\s+is\s+(.+)$/i],
    action: "SET_ANSWER", confirm: "",   // confirm is set dynamically with the value
    captureGroup: 1 },                    // index of capturing group to extract value

  { patterns: [/\b(submit\s+(my\s+)?answer|check\s+(my\s+)?answer|submit)\b/i],
    action: "SUBMIT", confirm: "Submitting your answer." },

  { patterns: [/\b(start\s+practice(\s+session)?|start\s+session|begin\s+practice|begin)\b/i],
    action: "START_SESSION", confirm: "Starting practice session." },

  { patterns: [/\b(start\s+voice\s+input|voice\s+input|speak\s+(my\s+)?(expression|answer)|dictate)\b/i],
    action: "START_VOICE_INPUT", confirm: "Starting voice input." },

  // "solve x squared plus 5" — captures expression and triggers solve
  { patterns: [/^solve\s+(.+)$/i, /^calculate\s+(.+)$/i, /^work\s+out\s+(.+)$/i],
    action: "SOLVE_EXPRESSION", confirm: "",
    captureGroup: 1 },

  { patterns: [/\b(confirm(\s+expression)?|use\s+this|yes\s+confirm)\b/i],
    action: "CONFIRM", confirm: "Confirmed." },

  { patterns: [/\b(discard|cancel\s+(voice|expression)?|try\s+again)\b/i],
    action: "DISCARD", confirm: "Discarded." },

  { patterns: [/\b(new\s+problem|solve\s+another|clear\s+workspace)\b/i],
    action: "NEW_PROBLEM", confirm: "Ready for a new problem." },

  // ── Auth ─────────────────────────────────────────────────────────────
  { patterns: [/\b(log\s*out|sign\s*out)\b/i],
    action: "LOGOUT",
    confirm: "Are you sure you want to log out? Say yes to confirm or no to cancel.",
    dangerous: true },

  // ── Settings voice commands ───────────────────────────────────────────
  { patterns: [/\b(voice\s+navigation|use\s+voice(\s+only)?)\b/i],
    action: "SET_NAV_VOICE", confirm: "Voice Navigation selected." },

  { patterns: [/\b(keyboard\s+navigation|use\s+keyboard(\s+only)?)\b/i],
    action: "SET_NAV_KEYBOARD", confirm: "Keyboard Navigation selected." },

  { patterns: [/\b(voice\s+and\s+keyboard|combined\s+navigation|both\s+voice\s+and\s+keyboard)\b/i],
    action: "SET_NAV_COMBINED", confirm: "Voice and Keyboard Navigation selected." },

  { patterns: [/\b(turn\s+on\s+(text\s+to\s+speech|speech|tts)|enable\s+(speech|tts))\b/i],
    action: "TTS_ON", confirm: "Text to speech enabled." },

  { patterns: [/\b(turn\s+off\s+(text\s+to\s+speech|speech|tts)|disable\s+(speech|tts))\b/i],
    action: "TTS_OFF", confirm: "Text to speech disabled." },

  { patterns: [/\b(set\s+speed\s+slow|slow\s+speech|speech\s+slow)\b/i],
    action: "TTS_RATE_SLOW", confirm: "Speech rate set to slow." },

  { patterns: [/\b(set\s+speed\s+fast|fast\s+speech|speech\s+fast)\b/i],
    action: "TTS_RATE_FAST", confirm: "Speech rate set to fast." },

  { patterns: [/\b(set\s+speed\s+(normal|medium)|normal\s+speech\s+speed)\b/i],
    action: "TTS_RATE_NORMAL", confirm: "Speech rate set to normal." },

  { patterns: [/\b(save\s+settings|apply\s+settings)\b/i],
    action: "SAVE_SETTINGS", confirm: "Saving settings." },

  // ── Topic selection ───────────────────────────────────────────────────
  { patterns: [/\b(select|choose)\s+arithmetic\b/i, /^arithmetic$/i],
    action: "SELECT_TOPIC_ARITHMETIC", confirm: "Arithmetic selected." },

  { patterns: [/\b(select|choose)\s+algebra\b/i, /^algebra$/i],
    action: "SELECT_TOPIC_ALGEBRA", confirm: "Algebra selected." },

  { patterns: [/\b(select|choose)\s+calculus\b/i, /^calculus$/i],
    action: "SELECT_TOPIC_CALCULUS", confirm: "Calculus selected." },

  { patterns: [/\b(select|choose)\s+other\b/i],
    action: "SELECT_TOPIC_OTHER", confirm: "Other topics selected." },

  // ── Difficulty selection ──────────────────────────────────────────────
  { patterns: [/\b(select|choose)\s+(easy|beginner)\b/i, /^(easy|beginner)$/i],
    action: "SELECT_DIFF_BEGINNER", confirm: "Easy difficulty selected." },

  { patterns: [/\b(select|choose)\s+(medium|intermediate)\b/i, /^(medium|intermediate)$/i],
    action: "SELECT_DIFF_INTERMEDIATE", confirm: "Medium difficulty selected." },

  { patterns: [/\b(select|choose)\s+(hard|advanced)\b/i, /^(hard|advanced)$/i],
    action: "SELECT_DIFF_ADVANCED", confirm: "Hard difficulty selected." },
];

/**
 * Try to match a transcript against the command list.
 * Returns { cmd, captured } where captured is the extracted value for
 * commands with captureGroup, or null if no match.
 */
export function matchCommand(transcript) {
  const text = transcript.trim();
  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      const m = pattern.exec(text);
      if (m) {
        const captured = cmd.captureGroup != null ? (m[cmd.captureGroup] || "").trim() : null;
        return { cmd, captured };
      }
    }
  }
  return null;
}

/**
 * Returns true if the text is a mathematical expression that should NOT
 * be treated as a navigation command.  Conservative — only blocks obvious math.
 */
export function looksLikeMath(text) {
  const t = text.trim().toLowerCase();
  const mathPatterns = [
    /\b(plus|minus|times|divided\s+by)\b/,
    /\b(squared|cubed|square\s+root|cube\s+root)\b/,
    /\b(is\s+equal\s+to|equals\s+zero|equals\s+one)\b/,
    /\b(to\s+the\s+power\s+of|raised\s+to)\b/,
    /\b(sqrt|sin|cos|tan|log\s+base|natural\s+log)\b/,
    /\b(integrate|differentiate|derivative\s+of|integral\s+of)\b/,
    /\b(percent\s+of)\b/,
    /\b\d+\s*[xyz]\b/,
    /\b(two|three|four|five|six|seven|eight|nine|ten)\s+[xyz]\b/,
  ];
  // Don't block "answer 5" or "my answer is 5" — those are commands
  if (/^(answer|my\s+answer\s+is|the\s+answer\s+is)\s+/i.test(t)) return false;
  return mathPatterns.some((r) => r.test(t));
}
