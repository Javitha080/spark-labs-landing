import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    LearningUserStats,
    LearningAchievement,
} from "@/types/learning";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";
import { useLearner } from "./LearnerContext";

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
 * Gamification Context — uses learner token ID as the primary identifier.
 * Falls back to Supabase auth user_id for admin users.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const { learner, isIdentified } = useLearner();
    const [stats, setStats] = useState<LearningUserStats | null>(null);
    const [achievements, setAchievements] = useState<LearningAchievement[]>([]);
    const [loading, setLoading] = useState(true);

    // Determine which identifier to use for DB queries
    // eslint-disable-next-line react-compiler/preserve-manual-memoization
    const getIdentifier = useCallback(async (): Promise<{ column: string; value: string } | null> => {
        if (isIdentified && learner) {
            return { column: "learner_token_id", value: learner.id };
        }
        // Fallback: check Supabase auth (for admin users)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return { column: "user_id", value: user.id };
        return null;
    }, [isIdentified, learner]);

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
        fetchData(); // eslint-disable-line react-hooks/set-state-in-effect -- async fetch sets state in callback
    }, [fetchData]);

    const addXp = useCallback(async (points: number) => {
        const id = await getIdentifier();
        if (!id) return;

        const { data: existing } = await (supabase
            .from("learning_user_stats")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("total_xp") as any)
            .eq(id.column, id.value)
            .maybeSingle();

        await supabase.from("learning_user_stats").upsert({
            [id.column]: id.value,
            total_xp: (existing?.total_xp || 0) + points,
            current_streak_days: existing ? undefined : 0,
            updated_at: new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, { onConflict: id.column });

        await fetchData();
    }, [getIdentifier, fetchData]);

    const todayStr = () => new Date().toISOString().slice(0, 10);

    const recordActivity = useCallback(async () => {
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

        await fetchData();
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
        } catch {
            return false;
        }
    }, [getIdentifier, addXp, fetchData]);

    return (
        <GamificationContext.Provider
            value={{
                stats,
                achievements,
                loading,
                addXp,
                recordActivity,
                awardAchievement,
                refresh: fetchData,
            }}
        >
            {children}
        </GamificationContext.Provider>
    );
}

export function useGamification() {
    const ctx = useContext(GamificationContext);
    if (ctx === undefined) throw new Error("useGamification must be used within GamificationProvider");
    return ctx;
}
