import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint } from "@/lib/fingerprint";
import { logError } from "@/lib/errors";

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
            // Token invalid: do NOT fall back to fingerprint matching to prevent
            // cross-user PII access from collisions or spoofing. Require re-registration.
            localStorage.removeItem(LEARNER_TOKEN_KEY);
          }
        }
      } catch (err) {
        logError(err, "LearnerContext.init");
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
  }, [learner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [learner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const registerLearner = async (data: { name: string; email: string; grade: string; phone: string; enrollmentId?: string }) => {
    // Generate a sufficiently long token (>=32 chars) by concatenating two UUIDs
    const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 48);
    const fp = generateFingerprint();

    let ip: string | null = null;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (res.ok) ip = (await res.json())?.ip ?? null;
    } catch {
      // best-effort; rate limit will fall back to email-based throttling
    }

    // Use rate-limited SECURITY DEFINER RPC instead of direct insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newLearner, error } = await (supabase.rpc as any)("create_learner_token", {
      p_token: token,
      p_name: data.name,
      p_email: data.email.toLowerCase().trim(),
      p_grade: data.grade,
      p_phone: data.phone,
      p_browser_fingerprint: fp,
      p_enrollment_id: data.enrollmentId || null,
      p_ip_address: ip,
    });

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
