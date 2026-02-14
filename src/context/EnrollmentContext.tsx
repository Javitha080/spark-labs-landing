import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Enrollment, UserProgress } from "@/types/learning";
import { toast } from "sonner";

interface EnrollmentContextType {
    enrollments: Enrollment[];
    progress: Record<string, UserProgress[]>; // course_id -> progress[]
    loading: boolean;
    enrollInCourse: (courseId: string) => Promise<void>;
    updateProgress: (courseId: string, moduleId: string, isCompleted: boolean) => Promise<void>;
    checkEnrollment: (courseId: string) => boolean;
    getCourseProgress: (courseId: string) => number;
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(undefined);

export function EnrollmentProvider({ children }: { children: React.ReactNode }) {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [progress, setProgress] = useState<Record<string, UserProgress[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEnrollments = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch Enrollments
            const { data: enrollData, error } = await supabase
                .from("learning_enrollments")
                .select("*")
                .eq("user_id", user.id);

            if (error) {
                console.error("Error fetching enrollments:", error);
            } else {
                setEnrollments(enrollData || []);
            }

            // Fetch Progress for all enrolled courses
            // Optimally we might want to fetch this only when entering a course, 
            // but for a small dashboard fetching all is fine.
            const { data: progressData } = await supabase
                .from("learning_progress")
                .select("*")
                .eq("user_id", user.id);

            if (progressData) {
                const progressMap: Record<string, UserProgress[]> = {};
                progressData.forEach(p => {
                    if (!progressMap[p.course_id]) progressMap[p.course_id] = [];
                    progressMap[p.course_id].push(p);
                });
                setProgress(progressMap);
            }

            setLoading(false);
        };

        fetchEnrollments();

        // Subscribe to changes? (Optional for now)
    }, []);

    const enrollInCourse = async (courseId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("You must be logged in to enroll.");
            return;
        }

        try {
            const { data, error } = await supabase
                .from("learning_enrollments")
                .insert({ user_id: user.id, course_id: courseId })
                .select()
                .single();

            if (error) throw error;

            setEnrollments([...enrollments, data]);
            toast.success("Successfully enrolled!");
        } catch (error) {
            console.error("Enrollment error:", error);
            toast.error("Failed to enroll in course.");
        }
    };

    const updateProgress = async (courseId: string, moduleId: string, isCompleted: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // Upsert progress
            const { data, error } = await supabase
                .from("learning_progress")
                .upsert({
                    user_id: user.id,
                    course_id: courseId,
                    module_id: moduleId,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date().toISOString() : null
                })
                .select()
                .single();

            if (error) throw error;

            // Update local state
            const currentCourseProgress = progress[courseId] || [];
            const updatedCourseProgress = [
                ...currentCourseProgress.filter(p => p.module_id !== moduleId),
                data
            ];

            setProgress({
                ...progress,
                [courseId]: updatedCourseProgress
            });

            // Calculate overall percentage
            // We need total modules count for this (which we might not have here easily without fetching).
            // For now, let's just trigger a re-fetch or rely on the UI to calculate based on what it sees.

        } catch (error) {
            console.error("Progress update error:", error);
            toast.error("Failed to update progress.");
        }
    };

    const checkEnrollment = (courseId: string) => {
        return enrollments.some(e => e.course_id === courseId);
    };

    const getCourseProgress = (courseId: string) => {
        const course = enrollments.find(e => e.course_id === courseId);
        return course?.progress || 0;
    };

    return (
        <EnrollmentContext.Provider value={{
            enrollments,
            progress,
            loading,
            enrollInCourse,
            updateProgress,
            checkEnrollment,
            getCourseProgress
        }}>
            {children}
        </EnrollmentContext.Provider>
    );
}

export const useEnrollment = () => {
    const context = useContext(EnrollmentContext);
    if (context === undefined) {
        throw new Error("useEnrollment must be used within an EnrollmentProvider");
    }
    return context;
};
