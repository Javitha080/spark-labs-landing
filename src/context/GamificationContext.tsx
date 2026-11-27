// react-doctor-disable no-react19-deprecated-apis
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase, getSharedSession } from "@/integrations/supabase/client";
import {
    LearningUserStats,
    LearningAchievement,
} from "@/types/learning";
import { ACHIEVEMENT_DEFINITIONS, shouldAwardComebackKid } from "@/lib/gamification";
import { logError } from "@/lib/errors";
import { useStudentSession } from "./StudentAuthContext";

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
 * Gamification Context - uses Supabase Auth user_id via StudentAuthContext,
 * falling back to shared Supabase session for admin users.
 */
export function GamificationProvider({ children }: { children: React.ReactNode }) {
    const { student, isAuthenticated, loading: authLoading } = useStudentSession();
    const studentAuthUserId = student?.authUserId ?? null;

    const [stats, setStats] = useState<LearningUserStats | null>(null);
    const [achievements, setAchievements] = useState<LearningAchievement[]>([]);
    const [loading, setLoading] = useState(true);
    const xpQueueRef = useRef<number[]>([]);
    const taskQueueRef = useRef<Array<() => Promise<unknown>>>([]);
    const runningRef = useRef(false);
    const xpDrainQueuedRef = useRef(false);
    const loadedUserIdRef = useRef<string | null>(null);

    const runTasks = useCallback(async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        try {
            // react-doctor-disable async-await-in-loop
            while (taskQueueRef.current.length > 0) {
                const task = taskQueueRef.current.shift();
                if (!task) continue;
                await task();
            }
        } finally {
            runningRef.current = false;
        }
    }, []);

    const enqueue = useCallback((task: () => Promise<unknown>): Promise<unknown> =>
        new Promise<unknown>((resolve) => {
            taskQueueRef.current.push(async () => {
                try {
                    resolve(await task());
                } catch (err) {
                    logError(err, "Gamification.queue");
                    resolve(undefined);
                }
            });
            void runTasks();
        }), [runTasks]);

    const getIdentifier = useCallback(async (): Promise<{ column: string; value: string } | null> => {
        if (isAuthenticated && studentAuthUserId) {
            return { column: "user_id", value: studentAuthUserId };
        }
        const { data: { session } } = await getSharedSession();
        const user = session?.user;
        if (user) return { column: "user_id", value: user.id };
        return null;
    }, [isAuthenticated, studentAuthUserId]);

    const fetchStatsOnly = useCallback(async (id?: { column: string; value: string } | null) => {
        const resolved = id ?? (await getIdentifier());
        if (!resolved) return;
        const statsRes = await (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase.from("learning_user_stats").select("*") as any
        )
            .eq(resolved.column, resolved.value)
            .maybeSingle();
        if (!statsRes.error) {
            setStats(statsRes.data as LearningUserStats | null);
        }
    }, [getIdentifier]);

    const fetchData = useCallback(async (force = true) => {
        const id = await getIdentifier();
        if (!id) {
            loadedUserIdRef.current = null;
            setStats(null);
            setAchievements([]);
            setLoading(false);
            return;
        }

        if (!force && loadedUserIdRef.current === id.value) {
            setLoading(false);
            return;
        }

        loadedUserIdRef.current = id.value;
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
        if (authLoading) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch sets state in callback
        void fetchData(false);
    }, [authLoading, fetchData]);

    const drainXpQueue = useCallback(async (id: { column: string; value: string }) => {
        // react-doctor-disable async-await-in-loop
        while (xpQueueRef.current.length > 0) {
            const batchPoints = xpQueueRef.current.splice(0).reduce((a, b) => a + b, 0);

            const { data: existing } = await (supabase
                .from("learning_user_stats")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .select("total_xp") as any)
                .eq(id.column, id.value)
                .maybeSingle();

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
    }, []);

    const awardCore = useCallback(async (
        type: keyof typeof ACHIEVEMENT_DEFINITIONS,
        id: { column: string; value: string },
    ): Promise<boolean> => {
        const def = ACHIEVEMENT_DEFINITIONS[type];
        if (!def) return false;

        try {
            const { data: existing, error: checkErr } = await (supabase
                .from("learning_achievements")
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .select("id") as any)
                .eq(id.column, id.value)
                .eq("achievement_type", type)
                .maybeSingle();
            if (checkErr) {
                logError(checkErr, "Gamification.awardAchievement.check");
                return false;
            }
            if (existing) return false;

            const { data: inserted, error: insertErr } = await supabase.from("learning_achievements").insert({
                [id.column]: id.value,
                achievement_type: type,
                points_earned: def.xp,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any).select("id").maybeSingle();
            if (insertErr) {
                logError(insertErr, "Gamification.awardAchievement.insert");
                return false;
            }

            if (!inserted) return false;

            xpQueueRef.current.push(def.xp);
            await drainXpQueue(id);
            return true;
        } catch (err) {
            logError(err, "Gamification.awardAchievement");
            return false;
        }
    }, [drainXpQueue]);

    const todayStr = () => new Date().toISOString().slice(0, 10);

    const addXp = useCallback(async (points: number) => {
        xpQueueRef.current.push(points);
        if (xpDrainQueuedRef.current) return;
        xpDrainQueuedRef.current = true;
        await enqueue(async () => {
            xpDrainQueuedRef.current = false;
            const id = await getIdentifier();
            if (!id) {
                xpQueueRef.current = [];
                return;
            }
            await drainXpQueue(id);
            await fetchStatsOnly(id);
        });
    }, [getIdentifier, fetchStatsOnly, drainXpQueue, enqueue]);

    const recordActivity = useCallback(async () => {
        await enqueue(async () => {
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

            if (newStreak >= 30) await awardCore("streak_30_days", id);
            else if (newStreak >= 7) await awardCore("streak_7_days", id);

            if (existing?.last_activity_date && shouldAwardComebackKid(existing.last_activity_date)) {
                await awardCore("comeback_kid", id);
            }

            await fetchData(true);
        });
    }, [getIdentifier, fetchData, enqueue, awardCore]);

    const awardAchievement = useCallback(async (type: keyof typeof ACHIEVEMENT_DEFINITIONS): Promise<boolean> => {
        const id = await getIdentifier();
        if (!id) return false;
        const awarded = (await enqueue(() => awardCore(type, id))) as boolean | undefined;
        if (awarded) await fetchData(true);
        return !!awarded;
    }, [getIdentifier, enqueue, awardCore, fetchData]);

    const refresh = useCallback(async () => {
        await fetchData(true);
    }, [fetchData]);

    const contextValue = useMemo(() => ({
        stats,
        achievements,
        loading,
        addXp,
        recordActivity,
        awardAchievement,
        refresh,
    }), [stats, achievements, loading, addXp, recordActivity, awardAchievement, refresh]);

    return (
        <GamificationContext.Provider
            value={contextValue}
        >
            {children}
        </GamificationContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGamification() {
    const ctx = useContext(GamificationContext);
    if (ctx === undefined) throw new Error("useGamification must be used within GamificationProvider");
    return ctx;
}
