// Used across multiple lazy-loaded pages (MyLearning, GamificationContext) - do NOT tree-shake
// NOTE: icon strings are emoji for now; migrate to Lucide components when the
// achievement UI is redesigned. Keys are stable — GamificationContext awards by
// key; `hint` is additive (shown on the My Learning achievement locker for
// locked badges).
export const ACHIEVEMENT_DEFINITIONS: Record<string, { label: string; xp: number; icon: string; hint?: string }> = {
    first_course: { label: "First Step", xp: 25, icon: "🎯", hint: "Enroll in your first course" },
    first_review_5_star: { label: "Five Stars", xp: 20, icon: "⭐", hint: "Leave a 5-star course review" },
    completed_course: { label: "Course Complete", xp: 100, icon: "🏆", hint: "Complete every lesson in a course" },
    streak_7_days: { label: "Week Streak", xp: 50, icon: "🔥", hint: "Learn something 7 days in a row" },
    module_complete: { label: "Module Done", xp: 10, icon: "✓", hint: "Mark a lesson as complete" },
    enrolled: { label: "Enrolled", xp: 5, icon: "📚", hint: "Sign up for any course" },
    qa_contributor: { label: "Q&A Star", xp: 15, icon: "💬", hint: "Ask or answer a question in a course Q&A" },
    three_courses: { label: "Triple Threat", xp: 40, icon: "🚀", hint: "Enroll in three different courses" },
    streak_30_days: { label: "Monthly Streak", xp: 150, icon: "💎", hint: "Learn something 30 days in a row" },
    note_taker: { label: "Note Taker", xp: 10, icon: "📝", hint: "Write a note of 20+ characters in a lesson" },
    speed_learner: { label: "Speed Learner", xp: 30, icon: "⚡", hint: "Complete 3 lessons within 24 hours of enrolling" },
    comeback_kid: { label: "Comeback Kid", xp: 20, icon: "🔄", hint: "Return after 3+ days away and keep learning" },
};

// ─── Award-predicate helpers (pure, unit-tested) ─────────────────────────────

// Speed Learner: 3 lessons completed within 24h of enrolling.
export const SPEED_LEARNER_MODULE_COUNT = 3;
export const SPEED_LEARNER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * True when `completedTimestamps` (learning_progress.completed_at values, may
 * include nulls) contains at least SPEED_LEARNER_MODULE_COUNT entries that fall
 * inside [enrolledAt, enrolledAt + SPEED_LEARNER_WINDOW_MS].
 */
export function shouldAwardSpeedLearner(
    enrolledAt: string | null | undefined,
    completedTimestamps: Array<string | null | undefined> | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!enrolledAt) return false;
    const enrolled = new Date(enrolledAt).getTime();
    if (!Number.isFinite(enrolled)) return false;
    const deadline = enrolled + SPEED_LEARNER_WINDOW_MS;
    // Cap the window at "now" so late-imported/historical completions can't
    // count toward a window that closed before the student started acting.
    const limit = Math.min(deadline, now.getTime());
    if (limit <= enrolled) return false;
    let inWindow = 0;
    for (const ts of completedTimestamps ?? []) {
        if (!ts) continue;
        const t = new Date(ts).getTime();
        if (Number.isFinite(t) && t >= enrolled && t <= limit) inWindow += 1;
        if (inWindow >= SPEED_LEARNER_MODULE_COUNT) return true;
    }
    return false;
}

// Comeback Kid: returns after MIN_COMEBACK_GAP_DAYS away and records activity.
export const MIN_COMEBACK_GAP_DAYS = 3;

/**
 * True when the student's previous activity date ("YYYY-MM-DD" from
 * learning_user_stats.last_activity_date) is at least MIN_COMEBACK_GAP_DAYS
 * calendar days before today. The very first activity ever (no previous date)
 * is a start, not a comeback, so callers pass null there.
 */
export function shouldAwardComebackKid(
    lastActivityDate: string | null | undefined,
    now: Date = new Date(),
): boolean {
    if (!lastActivityDate) return false;
    const last = new Date(`${String(lastActivityDate).slice(0, 10)}T00:00:00Z`);
    const todayMidnight = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(last.getTime()) || Number.isNaN(todayMidnight.getTime())) return false;
    const gapDays = Math.floor((todayMidnight.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
    return gapDays >= MIN_COMEBACK_GAP_DAYS;
}
