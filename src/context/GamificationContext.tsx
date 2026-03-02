import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    LearningUserStats,
    LearningAchievement,
} from "@/types/learning";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";

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
const STREAK_TZ = "UTC";

/**
 * SECURITY WARNING: Gamification Context handles state updates entirely client-side.
 * Without proper Supabase Row Level Security (RLS) policies, users can manually 
 * edit their `total_xp` or grant themselves achievements via the client SDK.
 * RLS MUST enforce that `user_id` matches the authenticated user and optionally
 * limit the `total_xp` increment bounds.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const [stats, setStats] = useState<LearningUserStats | null>(null);
    const [achievements, setAchievements] = useState<LearningAchievement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setStats(null);
            setAchievements([]);
            setLoading(false);
            return;
        }

        const [statsRes, achievementsRes] = await Promise.all([
            supabase.from("learning_user_stats").select("*").eq("user_id", user.id).maybeSingle(),
            supabase.from("learning_achievements").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }),
        ]);

        if (statsRes.data) setStats(statsRes.data as LearningUserStats);
        else setStats(null);
        setAchievements((achievementsRes.data as LearningAchievement[]) || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addXp = useCallback(async (points: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existing } = await supabase
            .from("learning_user_stats")
            .select("total_xp")
            .eq("user_id", user.id)
            .maybeSingle();

        await supabase.from("learning_user_stats").upsert({
            user_id: user.id,
            total_xp: (existing?.total_xp || 0) + points,
            current_streak_days: existing ? undefined : 0,
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        await fetchData();
    }, [fetchData]);

    const todayStr = () => new Date().toISOString().slice(0, 10);

    const recordActivity = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = todayStr();
        const { data: existing } = await supabase
            .from("learning_user_stats")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        let newStreak = 1;
        if (existing?.last_activity_date) {
            const last = existing.last_activity_date.toString().slice(0, 10);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().slice(0, 10);
            if (last === yesterdayStr) newStreak = (existing.current_streak_days || 0) + 1;
            else if (last !== today) newStreak = 1;
            else newStreak = existing.current_streak_days || 1; // same day, keep streak
        }

        await supabase.from("learning_user_stats").upsert({
            user_id: user.id,
            total_xp: (existing?.total_xp || 0) + XP_PER_ACTIVITY,
            current_streak_days: newStreak,
            last_activity_date: today,
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        await fetchData();
    }, [fetchData]);

    const awardAchievement = useCallback(async (type: keyof typeof ACHIEVEMENT_DEFINITIONS): Promise<boolean> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const def = ACHIEVEMENT_DEFINITIONS[type];
        if (!def) return false;

        // Check if already awarded
        const { data: existing } = await supabase
            .from("learning_achievements")
            .select("id")
            .eq("user_id", user.id)
            .eq("achievement_type", type)
            .maybeSingle();

        if (existing) return false;

        try {
            // Use upsert with ignoreDuplicates to prevent 409 on race conditions
            const { data: inserted } = await supabase.from("learning_achievements").upsert({
                user_id: user.id,
                achievement_type: type,
                points_earned: def.xp,
            }, { onConflict: "user_id,achievement_type", ignoreDuplicates: true }).select("id").maybeSingle();

            // Only award XP if we actually inserted (not a duplicate)
            if (inserted) {
                await addXp(def.xp);
            }
            await fetchData();
            return !!inserted;
        } catch {
            return false;
        }
    }, [addXp, fetchData]);

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
