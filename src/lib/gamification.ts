export const ACHIEVEMENT_DEFINITIONS: Record<string, { label: string; xp: number; icon: string }> = {
    first_course: { label: "First Step", xp: 25, icon: "🎯" },
    first_review_5_star: { label: "Five Stars", xp: 20, icon: "⭐" },
    completed_course: { label: "Course Complete", xp: 100, icon: "🏆" },
    streak_7_days: { label: "Week Streak", xp: 50, icon: "🔥" },
    module_complete: { label: "Module Done", xp: 10, icon: "✓" },
    enrolled: { label: "Enrolled", xp: 5, icon: "📚" },
};
