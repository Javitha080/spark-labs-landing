import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint } from "@/lib/fingerprint";
import { logError } from "@/lib/errors";

const LEARNER_TOKEN_KEY = "spark_learner_token";
const LAST_MODULE_KEY = "spark_last_module";
const LAST_TIMESTAMP_KEY = "spark_last_timestamp";

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
  last_module_id?: string | null;
  last_video_timestamp?: number | null;
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
  updateLastModule: (courseId: string, moduleId: string, videoTimestamp?: number) => Promise<void>;
  checkCourseEnrollment: (courseId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
  getLastModule: (courseId: string) => { moduleId: string | null; timestamp: number };
  registerLearner: (data: { name: string; email: string; grade: string; phone: string; enrollmentId?: string }) => Promise<void>;
  refreshEnrollments: () => Promise<void>;
  refreshProgress: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

/* ─── Retry helper with exponential backoff ─── */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as Error;
      // Don't retry auth/validation errors
      if (e?.message && /unauthorized|forbidden|JWT|invalid|duplicate/i.test(e.message)) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 300;
        console.warn(`[LearnerContext] ${label} attempt ${attempt + 1} failed, retrying in ${Math.round(delayMs)}ms`, e?.message);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        logError(err, `LearnerContext.${label}`);
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

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
    await withRetry(async () => {
      const { data, error } = await supabase
        .from("learner_course_enrollments")
        .select("*")
        .eq("learner_token_id", learner.id);
      if (error) throw error;
      setEnrollments((data as LearnerCourseEnrollment[]) || []);
    }, "fetchEnrollments");
  }, [learner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProgress = useCallback(async () => {
    if (!learner) return;
    await withRetry(async () => {
      const { data, error } = await supabase
        .from("learner_progress")
        .select("*")
        .eq("learner_token_id", learner.id);
      if (error) throw error;

      const progressMap: Record<string, LearnerModuleProgress[]> = {};
      (data || []).forEach((p: { course_id: string; [key: string]: unknown }) => {
        if (!progressMap[p.course_id]) progressMap[p.course_id] = [];
        progressMap[p.course_id].push(p as unknown as LearnerModuleProgress);
      });
      setProgress(progressMap);
    }, "fetchProgress");
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
    await withRetry(async () => {
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
    }, "enrollInCourse");
  };

  const updateModuleProgress = async (courseId: string, moduleId: string, isCompleted: boolean) => {
    if (!learner) return;

    await withRetry(async () => {
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
    }, "updateModuleProgress");

    // Also track this as the last viewed module
    await updateLastModule(courseId, moduleId).catch(() => { /* best-effort */ });

    // Refetch enrollments to get updated progress %
    await fetchEnrollments();
  };

  /**
   * Game-save: Track the last module the student was viewing in a course,
   * plus optional video timestamp for resume.
   * Persists to both localStorage (instant) and Supabase (cross-device).
   */
  const updateLastModule = async (courseId: string, moduleId: string, videoTimestamp?: number) => {
    // Instant local save for same-browser resume
    try {
      const localData = JSON.parse(localStorage.getItem(LAST_MODULE_KEY) || "{}");
      localData[courseId] = moduleId;
      localStorage.setItem(LAST_MODULE_KEY, JSON.stringify(localData));

      if (videoTimestamp !== undefined) {
        const tsData = JSON.parse(localStorage.getItem(LAST_TIMESTAMP_KEY) || "{}");
        tsData[`${courseId}:${moduleId}`] = videoTimestamp;
        localStorage.setItem(LAST_TIMESTAMP_KEY, JSON.stringify(tsData));
      }
    } catch { /* localStorage quota exceeded — non-critical */ }

    // Persist to server (best-effort, don't block UI)
    if (!learner) return;
    try {
      await supabase
        .from("learner_course_enrollments")
        .update({
          last_module_id: moduleId,
          ...(videoTimestamp !== undefined ? { last_video_timestamp: videoTimestamp } : {}),
        } as any)
        .eq("learner_token_id", learner.id)
        .eq("course_id", courseId);
    } catch {
      // Best-effort: localStorage already has the data
    }
  };

  /**
   * Get the last module + video timestamp for a course.
   * Checks localStorage first (instant), falls back to enrollment data.
   */
  const getLastModule = (courseId: string): { moduleId: string | null; timestamp: number } => {
    // Try localStorage first (fastest)
    try {
      const localData = JSON.parse(localStorage.getItem(LAST_MODULE_KEY) || "{}");
      const moduleId = localData[courseId] || null;
      if (moduleId) {
        const tsData = JSON.parse(localStorage.getItem(LAST_TIMESTAMP_KEY) || "{}");
        const timestamp = tsData[`${courseId}:${moduleId}`] || 0;
        return { moduleId, timestamp };
      }
    } catch { /* fallthrough */ }

    // Fall back to enrollment data from server
    const enrollment = enrollments.find((e) => e.course_id === courseId);
    return {
      moduleId: enrollment?.last_module_id || null,
      timestamp: enrollment?.last_video_timestamp || 0,
    };
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
        updateLastModule,
        checkCourseEnrollment,
        getCourseProgress,
        getLastModule,
        registerLearner,
        refreshEnrollments: fetchEnrollments,
        refreshProgress: fetchProgress,
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

