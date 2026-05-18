// Used across multiple lazy-loaded pages (MyLearning, GamificationContext) — do NOT tree-shake
export const ACHIEVEMENT_DEFINITIONS: Record<string, { label: string; xp: number; icon: string }> = {
    first_course: { label: "First Step", xp: 25, icon: "🎯" },
    first_review_5_star: { label: "Five Stars", xp: 20, icon: "⭐" },
    completed_course: { label: "Course Complete", xp: 100, icon: "🏆" },
    streak_7_days: { label: "Week Streak", xp: 50, icon: "🔥" },
    module_complete: { label: "Module Done", xp: 10, icon: "✓" },
    enrolled: { label: "Enrolled", xp: 5, icon: "📚" },
    qa_contributor: { label: "Q&A Star", xp: 15, icon: "💬" },
    three_courses: { label: "Triple Threat", xp: 40, icon: "🚀" },
    streak_30_days: { label: "Monthly Streak", xp: 150, icon: "💎" },
    note_taker: { label: "Note Taker", xp: 10, icon: "📝" },
    speed_learner: { label: "Speed Learner", xp: 30, icon: "⚡" },
    comeback_kid: { label: "Comeback Kid", xp: 20, icon: "🔄" },
};
