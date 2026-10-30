// react-doctor-disable no-react19-deprecated-apis
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase, getSharedSession } from "@/integrations/supabase/client";
import {
    LearningUserStats,
    LearningAchievement,
} from "@/types/learning";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";
import { logError } from "@/lib/errors";
import { useStudentAuth } from "./StudentAuthContext";

type GamificationContextType = {
    stats: LearningUserStats | null;
    achievements: LearningAchievement[];
    loading: boolean;
    addXp: (points: number) => Promise<void>;
    recordActivity: () => Promise<void>;
    awardAchievement: (type: keyof typeof ACHIEVEMENT_DEFINITIONS) => Promise<boolean>;
    refresh: () => Promise<void>;
};

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const XP_PER_ACTIVITY = 5;

/**
 * Gamification Context - uses learner token ID as the primary identifier.
 * Falls back to Supabase auth user_id for admin users.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const { student, isAuthenticated } = useStudentAuth();
    const [stats, setStats] = useState<LearningUserStats | null>(null);
    const [achievements, setAchievements] = useState<LearningAchievement[]>([]);
    const [loading, setLoading] = useState(true);
    const busyRef = useRef(false);
    const xpQueueRef = useRef<number[]>([]);
    // Lets recordActivity trigger streak badges without forward-referencing
    // awardAchievement in its dependency order (assigned after it is defined).
    const awardRef = useRef<(type: keyof typeof ACHIEVEMENT_DEFINITIONS) => Promise<boolean>>(async () => false);

    // Determine which identifier to use for DB queries
    const getIdentifier = useCallback(async (): Promise<{ column: string; value: string } | null> => {
        if (isAuthenticated && student) {
            // Students now use Supabase Auth - use user_id column
            return { column: "user_id", value: student.authUserId };
        }
        // Fallback: check Supabase auth (for admin users)
        const { data: { session } } = await getSharedSession();
        const user = session?.user;
        if (user) return { column: "user_id", value: user.id };
        return null;
    }, [isAuthenticated, student]);

    const fetchData = useCallback(async () => {
        const id = await getIdentifier();
        if (!id) {
            setStats(null);
            setAchievements([]);
            setLoading(false);
            return;
        }

        const [statsRes, achievementsRes] = await Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from("learning_user_stats").select("*") as any).eq(id.column, id.value).maybeSingle(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (supabase.from("learning_achievements").select("*") as any).eq(id.column, id.value).order("earned_at", { ascending: false }),
        ]);

        setStats(statsRes.data as LearningUserStats | null);
        setAchievements((achievementsRes.data as LearningAchievement[]) || []);
        setLoading(false);
    }, [getIdentifier]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sets state in callback
        void fetchData();
    }, [fetchData]);

    const addXp = useCallback(async (points: number) => {
        // Queue XP additions to prevent race conditions on read-then-write
        xpQueueRef.current.push(points);
        if (busyRef.current) return;
        busyRef.current = true;
        try {
            const id = await getIdentifier();
            if (!id) return;

            // react-doctor-disable async-await-in-loop
            while (xpQueueRef.current.length > 0) {
                const batchPoints = xpQueueRef.current.splice(0).reduce((a, b) => a + b, 0);

                const { data: existing } = await (supabase
                    .from("learning_user_stats")
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .select("total_xp") as any)
                    .eq(id.column, id.value)
                    .maybeSingle();

                // undefined keys in an upsert payload are sent as null by
                // supabase-js; a conditional payload instead of
                // `current_streak_days: existing ? undefined : 0` avoids
                // NULLing the streak column on every XP write.
                const payload: Record<string, unknown> = {
                    [id.column]: id.value,
                    total_xp: (existing?.total_xp || 0) + batchPoints,
                    updated_at: new Date().toISOString(),
                };
                if (!existing) payload.current_streak_days = 0;

                await supabase.from("learning_user_stats").upsert(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    payload as any,
                    { onConflict: id.column }
                );
            }

            await fetchData();
        } finally {
            busyRef.current = false;
        }
    }, [getIdentifier, fetchData]);

    const todayStr = () => new Date().toISOString().slice(0, 10);

    const recordActivity = useCallback(async () => {
        // Serialize to prevent race conditions on read-then-write
        let streakBadge: "streak_7_days" | "streak_30_days" | null = null;
        if (busyRef.current) return;
        busyRef.current = true;
        try {
            const id = await getIdentifier();
            if (!id) return;

            const today = todayStr();
            const { data: existing } = await (supabase
                .from("learning_user_stats")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .select("*") as any)
                .eq(id.column, id.value)
                .maybeSingle();

            let newStreak = 1;
            if (existing?.last_activity_date) {
                const last = existing.last_activity_date.toString().slice(0, 10);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().slice(0, 10);
                if (last === yesterdayStr) newStreak = (existing.current_streak_days || 0) + 1;
                else if (last !== today) newStreak = 1;
                else newStreak = existing.current_streak_days || 1;
            }

            await supabase.from("learning_user_stats").upsert({
                [id.column]: id.value,
                total_xp: (existing?.total_xp || 0) + XP_PER_ACTIVITY,
                current_streak_days: newStreak,
                last_activity_date: today,
                updated_at: new Date().toISOString(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any, { onConflict: id.column });

            // Streak badges were defined but never awarded anywhere — fire
            // (once; awardAchievement dedupes) after the lock is released so
            // its own XP write isn't skipped by busyRef.
            if (newStreak >= 30) streakBadge = "streak_30_days";
            else if (newStreak >= 7) streakBadge = "streak_7_days";

            await fetchData();
        } finally {
            busyRef.current = false;
        }
        if (streakBadge) {
            void awardRef.current(streakBadge).catch(() => { });
        }
    }, [getIdentifier, fetchData]);

    const awardAchievement = useCallback(async (type: keyof typeof ACHIEVEMENT_DEFINITIONS): Promise<boolean> => {
        const id = await getIdentifier();
        if (!id) return false;

        const def = ACHIEVEMENT_DEFINITIONS[type];
        if (!def) return false;

        // Check if already awarded
        const { data: existing } = await (supabase
            .from("learning_achievements")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("id") as any)
            .eq(id.column, id.value)
            .eq("achievement_type", type)
            .maybeSingle();

        if (existing) return false;

        try {
            const { data: inserted } = await supabase.from("learning_achievements").insert({
                [id.column]: id.value,
                achievement_type: type,
                points_earned: def.xp,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any).select("id").maybeSingle();

            if (inserted) {
                await addXp(def.xp);
            }
            await fetchData();
            return !!inserted;
        } catch (err) {
            // Surface, don't swallow: an RLS rejection here previously went
            // completely silent and students appeared to earn nothing.
            logError(err, "Gamification.awardAchievement");
            return false;
        }
    }, [getIdentifier, addXp, fetchData]);
    // Wire the ref used by recordActivity's streak badge awards. Written in an
    // effect: assigning a ref during render violates react-hooks/refs.
    useEffect(() => {
        awardRef.current = awardAchievement;
    }, [awardAchievement]);

    const contextValue = useMemo(() => ({
        stats,
        achievements,
        loading,
        addXp,
        recordActivity,
        awardAchievement,
        refresh: fetchData,
    }), [stats, achievements, loading, addXp, recordActivity, awardAchievement, fetchData]);

    return (
        <GamificationContext.Provider
            value={contextValue}
        >
            {children}
        </GamificationContext.Provider>
    );
}

// Context + hook pair - the hook is intentionally exported beside its provider
// (standard React context pattern).
// eslint-disable-next-line react-refresh/only-export-components
export function useGamification() {
    const ctx = useContext(GamificationContext);
    if (ctx === undefined) throw new Error("useGamification must be used within GamificationProvider");
    return ctx;
}
