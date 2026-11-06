import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/context/StudentAuthContext";
import type { Course } from "@/types/learning";
import { logError } from "@/lib/errors";

// The remaining Udemy parity feature: save a course for later, review and
// remove saved courses from My Learning. Guests get routed to the student
// sign-in page like the enroll flow does.
export function useWishlist() {
    const { student, isAuthenticated } = useStudentAuth();
    const navigate = useNavigate();
    const [savedCourses, setSavedCourses] = useState<Course[]>([]);
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const refresh = useCallback(async () => {
        if (!isAuthenticated || !student) {
            setSavedCourses([]);
            setSavedIds(new Set());
            setLoading(false);
            return;
        }
        const { data, error } = await supabase
            .from("learning_wishlist")
            .select("id, course_id, created_at, courses:learning_courses(*)")
            .order("created_at", { ascending: false });
        if (error) {
            logError(error, "useWishlist.refresh");
            setLoading(false);
            return;
        }
        // Deleted courses cascade in SQL, but a campaign could hide one
        // (is_published=false) — filter rows without a usable course either way.
        const rows = (data as unknown as Array<{ course_id: string; courses: Course | Course[] | null }>) ?? [];
        const courses: Course[] = [];
        const ids = new Set<string>();
        for (const row of rows) {
            ids.add(row.course_id);
            const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
            if (course) courses.push(course);
        }
        setSavedCourses(courses);
        setSavedIds(ids);
        setLoading(false);
    }, [isAuthenticated, student]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async refresh; the signed-out branch clears state before its first await (repo-wide pattern for data-fetch effects)
        void refresh();
    }, [refresh]);

    const toggle = useCallback(async (courseId: string): Promise<boolean> => {
        if (!isAuthenticated || !student) {
            toast.error("Sign in to save courses to your wishlist.");
            navigate("/student/login");
            return false;
        }
        if (pendingIds.has(courseId)) return savedIds.has(courseId);

        const willSave = !savedIds.has(courseId);
        setPendingIds(prev => new Set(prev).add(courseId));

        // Optimistic update — revert on failure.
        setSavedIds(prev => {
            const next = new Set(prev);
            if (willSave) next.add(courseId);
            else next.delete(courseId);
            return next;
        });
        setSavedCourses(prev => {
            if (willSave) {
                const joinRow = savedCourses.find(c => c.id === courseId);
                if (joinRow) return [joinRow, ...prev];
                return prev;
            }
            return prev.filter(c => c.id !== courseId);
        });

        try {
            if (willSave) {
                const { error } = await supabase
                    .from("learning_wishlist")
                    .insert({ user_id: student.authUserId, course_id: courseId });
                // Already-saved (23505) is the same end state — not a failure.
                if (error && error.code !== "23505") throw error;
                toast.success("Saved to your wishlist.");
            } else {
                const { error } = await supabase
                    .from("learning_wishlist")
                    .delete()
                    .eq("user_id", student.authUserId)
                    .eq("course_id", courseId);
                if (error) throw error;
                toast.success("Removed from your wishlist.");
            }
            // Bring the joined course list back in sync with the ids.
            await refresh();
            return willSave;
        } catch (err: unknown) {
            logError(err, "useWishlist.toggle");
            toast.error(err instanceof Error ? err.message : "Could not update your wishlist.");
            await refresh();
            return savedIds.has(courseId);
        } finally {
            setPendingIds(prev => {
                const next = new Set(prev);
                next.delete(courseId);
                return next;
            });
        }
    }, [isAuthenticated, student, navigate, pendingIds, savedIds, savedCourses, refresh]);

    const has = useCallback((courseId: string) => savedIds.has(courseId), [savedIds]);
    const pending = useCallback((courseId: string) => pendingIds.has(courseId), [pendingIds]);

    return { savedCourses, savedIds, loading, refresh, toggle, has, pending };
}
