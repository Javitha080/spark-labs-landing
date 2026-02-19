import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Course } from "@/types/learning";

const RECOMMENDATIONS_LIMIT = 6;

/**
 * Record a learning interaction (view or enroll) for recommendations.
 */
export async function recordLearningInteraction(
    userId: string,
    courseId: string,
    type: "view" | "enroll"
) {
    await supabase.from("learning_user_interactions").insert({
        user_id: userId,
        course_id: courseId,
        interaction_type: type,
    });
}

/**
 * Fetch recommended courses for the current user based on:
 * - Categories of courses they viewed/enrolled
 * - Exclude already enrolled courses
 */
export function useRecommendedCourses(enrolledCourseIds: string[] = []) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setCourses([]);
            setLoading(false);
            return;
        }

        const { data: interactions } = await supabase
            .from("learning_user_interactions")
            .select("course_id, interaction_type")
            .eq("user_id", user.id)
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

        const courseIds = [...new Set(interactions.map((i) => i.course_id))];
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
        setLoading(false);
    }, [enrolledCourseIds.join(",")]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return { recommendedCourses: courses, loading, refresh: fetch };
}
