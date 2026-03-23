import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Course } from "@/types/learning";

const RECOMMENDATIONS_LIMIT = 6;

/**
 * Record a learning interaction (view or enroll) for recommendations.
 * Supports both auth users (user_id) and learner tokens (learner_token_id).
 */
export async function recordLearningInteraction(
    identifier: { user_id?: string; learner_token_id?: string },
    courseId: string,
    type: "view" | "enroll"
) {
    if (!identifier.user_id && !identifier.learner_token_id) return;

    const { error } = await supabase.from("learning_user_interactions").insert({
        user_id: identifier.user_id || null,
        learner_token_id: identifier.learner_token_id || null,
        course_id: courseId,
        interaction_type: type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (error) {
        console.error("Failed to record learning interaction:", error);
    }
}

/**
 * Fetch recommended courses based on:
 * - Categories of courses the learner viewed/enrolled
 * - Exclude already enrolled courses
 * Supports both auth users and learner token users.
 */
export function useRecommendedCourses(enrolledCourseIds: string[] = [], learnerTokenId?: string) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const enrolledIdsKey = enrolledCourseIds.join(",");

    const fetchRecommendations = useCallback(async () => {
      try {
        // Determine identity column and value
        let idColumn: string | null = null;
        let idValue: string | null = null;

        if (learnerTokenId) {
            idColumn = "learner_token_id";
            idValue = learnerTokenId;
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                idColumn = "user_id";
                idValue = user.id;
            }
        }

        // If no identity, just return popular courses
        if (!idColumn || !idValue) {
            let query = supabase
                .from("learning_courses")
                .select("*")
                .eq("is_published", true)
                .order("enrolled_count", { ascending: false });
            if (enrolledCourseIds.length > 0) {
                query = query.not("id", "in", `(${enrolledCourseIds.join(",")})`);
            }
            const { data } = await query.limit(RECOMMENDATIONS_LIMIT);
            setCourses((data as Course[]) || []);
            setLoading(false);
            return;
        }

        const { data: interactions } = await (supabase
            .from("learning_user_interactions")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("course_id, interaction_type") as any)
            .eq(idColumn, idValue)
            .order("created_at", { ascending: false })
            .limit(50);

        if (!interactions?.length) {
            let query = supabase
                .from("learning_courses")
                .select("*")
                .eq("is_published", true)
                .order("enrolled_count", { ascending: false });
            if (enrolledCourseIds.length > 0) {
                query = query.not("id", "in", `(${enrolledCourseIds.join(",")})`);
            }
            const { data } = await query.limit(RECOMMENDATIONS_LIMIT);
            setCourses((data as Course[]) || []);
            setLoading(false);
            return;
        }

        const courseIds = [...new Set((interactions as { course_id: string }[]).map((i) => i.course_id))];
        const { data: interactedCourses } = await supabase
            .from("learning_courses")
            .select("id, category")
            .in("id", courseIds);

        const categories = (interactedCourses || [])
            .map((c) => (c as { category: string }).category)
            .filter(Boolean) as string[];
        const preferredCategories = [...new Set(categories)];

        let query = supabase
            .from("learning_courses")
            .select("*")
            .eq("is_published", true)
            .order("enrolled_count", { ascending: false });
        if (preferredCategories.length > 0) {
            query = query.in("category", preferredCategories);
        }
        if (enrolledCourseIds.length > 0) {
            query = query.not("id", "in", `(${enrolledCourseIds.join(",")})`);
        }
        const { data } = await query.limit(RECOMMENDATIONS_LIMIT);
        setCourses((data as Course[]) || []);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setLoading(false);
      }
    }, [enrolledIdsKey, learnerTokenId, enrolledCourseIds]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRecommendations();
    }, [fetchRecommendations]);

    return { recommendedCourses: courses, loading, refresh: fetchRecommendations };
}
