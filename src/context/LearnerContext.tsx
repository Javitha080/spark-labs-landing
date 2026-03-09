import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint } from "@/lib/fingerprint";

const LEARNER_TOKEN_KEY = "spark_learner_token";

export interface LearnerProfile {
  id: string;
  token: string;
  name: string;
  email: string;
  grade: string;
  phone: string;
  enrollment_id: string | null;
  created_at: string;
}

export interface LearnerCourseEnrollment {
  id: string;
  learner_token_id: string;
  course_id: string;
  enrolled_at: string;
  progress: number;
  completed_at: string | null;
}

export interface LearnerModuleProgress {
  id: string;
  learner_token_id: string;
  course_id: string;
  module_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface LearnerContextType {
  learner: LearnerProfile | null;
  loading: boolean;
  enrollments: LearnerCourseEnrollment[];
  progress: Record<string, LearnerModuleProgress[]>;
  isIdentified: boolean;
  enrollInCourse: (courseId: string) => Promise<void>;
  updateModuleProgress: (courseId: string, moduleId: string, isCompleted: boolean) => Promise<void>;
  checkCourseEnrollment: (courseId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
  registerLearner: (data: { name: string; email: string; grade: string; phone: string; enrollmentId?: string }) => Promise<void>;
  refreshEnrollments: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<LearnerCourseEnrollment[]>([]);
  const [progress, setProgress] = useState<Record<string, LearnerModuleProgress[]>>({});

  // Load learner from localStorage on mount
  useEffect(() => {
    const init = async () => {
      try {
        const savedToken = localStorage.getItem(LEARNER_TOKEN_KEY);
        if (savedToken) {
          const { data, error } = await supabase
            .from("learner_tokens")
            .select("*")
            .eq("token", savedToken)
            .maybeSingle();

          if (data && !error) {
            setLearner(data as LearnerProfile);
            // Update last_seen_at
            await supabase
              .from("learner_tokens")
              .update({ last_seen_at: new Date().toISOString(), browser_fingerprint: generateFingerprint() })
              .eq("id", data.id);
          } else {
            // Token invalid, try fingerprint match
            const fp = generateFingerprint();
            const { data: fpMatch } = await supabase
              .from("learner_tokens")
              .select("*")
              .eq("browser_fingerprint", fp)
              .maybeSingle();

            if (fpMatch) {
              setLearner(fpMatch as LearnerProfile);
              localStorage.setItem(LEARNER_TOKEN_KEY, fpMatch.token);
              await supabase
                .from("learner_tokens")
                .update({ last_seen_at: new Date().toISOString() })
                .eq("id", fpMatch.id);
            }
          }
        } else {
          // No token saved, try fingerprint
          const fp = generateFingerprint();
          const { data: fpMatch } = await supabase
            .from("learner_tokens")
            .select("*")
            .eq("browser_fingerprint", fp)
            .maybeSingle();

          if (fpMatch) {
            setLearner(fpMatch as LearnerProfile);
            localStorage.setItem(LEARNER_TOKEN_KEY, fpMatch.token);
          }
        }
      } catch (err) {
        console.error("Learner init error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch enrollments when learner is set
  useEffect(() => {
    if (learner) {
      fetchEnrollments();
      fetchProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learner?.id]);

  const fetchEnrollments = useCallback(async () => {
    if (!learner) return;
    const { data } = await supabase
      .from("learner_course_enrollments")
      .select("*")
      .eq("learner_token_id", learner.id);
    setEnrollments((data as LearnerCourseEnrollment[]) || []);
  }, [learner]);

  const fetchProgress = useCallback(async () => {
    if (!learner) return;
    const { data } = await supabase
      .from("learner_progress")
      .select("*")
      .eq("learner_token_id", learner.id);

    const progressMap: Record<string, LearnerModuleProgress[]> = {};
    (data || []).forEach((p: { course_id: string; [key: string]: unknown }) => {
      if (!progressMap[p.course_id]) progressMap[p.course_id] = [];
      progressMap[p.course_id].push(p as unknown as LearnerModuleProgress);
    });
    setProgress(progressMap);
  }, [learner]);

  const registerLearner = async (data: { name: string; email: string; grade: string; phone: string; enrollmentId?: string }) => {
    const token = crypto.randomUUID();
    const fp = generateFingerprint();

    const { data: newLearner, error } = await supabase
      .from("learner_tokens")
      .insert({
        token,
        browser_fingerprint: fp,
        name: data.name,
        email: data.email.toLowerCase().trim(),
        grade: data.grade,
        phone: data.phone,
        enrollment_id: data.enrollmentId || null,
      })
      .select()
      .single();

    if (error) throw error;
    
    localStorage.setItem(LEARNER_TOKEN_KEY, token);
    setLearner(newLearner as LearnerProfile);
  };

  const enrollInCourse = async (courseId: string) => {
    if (!learner) return;
    const { data, error } = await supabase
      .from("learner_course_enrollments")
      .insert({ learner_token_id: learner.id, course_id: courseId })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return; // Already enrolled
      throw error;
    }

    setEnrollments((prev) => [...prev, data as LearnerCourseEnrollment]);
  };

  const updateModuleProgress = async (courseId: string, moduleId: string, isCompleted: boolean) => {
    if (!learner) return;

    const { data, error } = await supabase
      .from("learner_progress")
      .upsert({
        learner_token_id: learner.id,
        course_id: courseId,
        module_id: moduleId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update local progress
    const courseProgress = progress[courseId] || [];
    const updated = [
      ...courseProgress.filter((p) => p.module_id !== moduleId),
      data as LearnerModuleProgress,
    ];
    setProgress((prev) => ({ ...prev, [courseId]: updated }));

    // Refetch enrollments to get updated progress %
    await fetchEnrollments();
  };

  const checkCourseEnrollment = (courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  };

  const getCourseProgress = (courseId: string) => {
    const enrollment = enrollments.find((e) => e.course_id === courseId);
    return enrollment?.progress || 0;
  };

  return (
    <LearnerContext.Provider
      value={{
        learner,
        loading,
        enrollments,
        progress,
        isIdentified: !!learner,
        enrollInCourse,
        updateModuleProgress,
        checkCourseEnrollment,
        getCourseProgress,
        registerLearner,
        refreshEnrollments: fetchEnrollments,
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
}

export const useLearner = () => {
  const context = useContext(LearnerContext);
  if (!context) throw new Error("useLearner must be used within LearnerProvider");
  return context;
};
