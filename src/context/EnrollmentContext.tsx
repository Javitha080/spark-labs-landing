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

    const fetchEnrollments = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: enrollData, error } = await supabase
            .from("learning_enrollments")
            .select("*")
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching enrollments:", error);
        } else {
            setEnrollments(enrollData || []);
        }

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

    useEffect(() => {
        fetchEnrollments();
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

            const currentCourseProgress = progress[courseId] || [];
            const updatedCourseProgress = [
                ...currentCourseProgress.filter(p => p.module_id !== moduleId),
                data
            ];

            setProgress({
                ...progress,
                [courseId]: updatedCourseProgress
            });

            // Refetch enrollments so progress % (updated by DB trigger) is correct in UI
            const { data: enrollData } = await supabase
                .from("learning_enrollments")
                .select("*")
                .eq("user_id", user.id);
            if (enrollData) setEnrollments(enrollData);
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
