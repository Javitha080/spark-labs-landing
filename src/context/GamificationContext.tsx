// react-doctor-disable no-react19-deprecated-apis
import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase, getSharedSession } from "@/integrations/supabase/client";
import {
    LearningUserStats,
    LearningAchievement,
} from "@/types/learning";
import { ACHIEVEMENT_DEFINITIONS, shouldAwardComebackKid } from "@/lib/gamification";
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
    const xpQueueRef = useRef<number[]>([]);
    // Single serialized task queue replaces the old mutual busyRef: recordActivity
    // used to EARLY-RETURN whenever any other op held the lock, silently dropping
    // streak days on the primary "learn" action, and XP queued during
    // recordActivity was never drained by it.
    const taskQueueRef = useRef<Array<() => Promise<unknown>>>([]);
    const runningRef = useRef(false);
    const xpDrainQueuedRef = useRef(false);

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

    // Plain helper (NOT enqueued): drains the XP queue for the given identity.
    // Shared by the queued XP-drain task and the badge-award path so batch XP
    // writes stay serialized no matter who triggers them.
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
    }, []);

    // Plain helper (NOT enqueued): the idempotent badge award. Insert failures
    // are surfaced, not swallowed - an RLS rejection here previously went
    // completely silent and students appeared to earn nothing.
    const awardCore = useCallback(async (
        type: keyof typeof ACHIEVEMENT_DEFINITIONS,
        id: { column: string; value: string },
    ): Promise<boolean> => {
        const def = ACHIEVEMENT_DEFINITIONS[type];
        if (!def) return false;

        try {
            // Check if already awarded
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

            // XP flows through the shared queue; draining inline keeps the
            // badge XP inside this serialized task (never re-enqueue from a
            // queued task - that would deadlock the queue).
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
        // Queue XP additions to prevent race conditions on read-then-write.
        xpQueueRef.current.push(points);
        // One queued drain coalesces every XP push that lands while it waits.
        if (xpDrainQueuedRef.current) return;
        xpDrainQueuedRef.current = true;
        await enqueue(async () => {
            // Cleared at start, not end: pushes that land after the final
            // splice still schedule their own follow-up drain instead of
            // being dropped.
            xpDrainQueuedRef.current = false;
            const id = await getIdentifier();
            if (!id) {
                xpQueueRef.current = [];
                return;
            }
            await drainXpQueue(id);
            await fetchData();
        });
    }, [getIdentifier, fetchData, drainXpQueue, enqueue]);

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

            // Streak badges were defined but never awarded anywhere — fire
            // (once; awardCore dedupes) inline now that the queue serializes
            // everything: the badge XP lands in the same serialized pipeline.
            if (newStreak >= 30) await awardCore("streak_30_days", id);
            else if (newStreak >= 7) await awardCore("streak_7_days", id);

            // A previous activity far enough in the past is a "comeback" — the
            // gap is computed from the row BEFORE this upsert overwrote it.
            if (existing?.last_activity_date && shouldAwardComebackKid(existing.last_activity_date)) {
                await awardCore("comeback_kid", id);
            }

            await fetchData();
        });
    }, [getIdentifier, fetchData, enqueue, awardCore]);

    const awardAchievement = useCallback(async (type: keyof typeof ACHIEVEMENT_DEFINITIONS): Promise<boolean> => {
        const id = await getIdentifier();
        if (!id) return false;
        const awarded = (await enqueue(() => awardCore(type, id))) as boolean | undefined;
        if (awarded) await fetchData();
        return !!awarded;
    }, [getIdentifier, enqueue, awardCore, fetchData]);

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
