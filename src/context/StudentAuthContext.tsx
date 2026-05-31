// react-doctor-disable no-react19-deprecated-apis
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase, getSharedSession } from "@/integrations/supabase/client";
import { logError } from "@/lib/errors";
import type { Session } from "@supabase/supabase-js";

const LAST_MODULE_KEY = "spark_last_module";
const LAST_TIMESTAMP_KEY = "spark_last_timestamp";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  grade: string | null;
  phone: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StudentCourseEnrollment {
  id: string;
  auth_user_id: string;
  course_id: string;
  enrolled_at?: string;
  progress: number;
  completed_at: string | null;
  last_module_id?: string | null;
  last_video_timestamp?: number | null;
  courses?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail_url: string;
    category: string;
    difficulty_level: string;
  };
}

export interface StudentModuleProgress {
  id: string;
  auth_user_id: string;
  course_id: string;
  module_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface StudentAuthContextType {
  student: StudentProfile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  enrollments: StudentCourseEnrollment[];
  progress: Record<string, StudentModuleProgress[]>;

  // Auth
  signIn: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;

  // Learning
  enrollInCourse: (courseId: string) => Promise<void>;
  updateModuleProgress: (courseId: string, moduleId: string, completed: boolean) => Promise<void>;
  updateLastModule: (courseId: string, moduleId: string, timestamp?: number) => Promise<void>;
  getLastModule: (courseId: string) => { moduleId: string | null; timestamp: number };
  checkCourseEnrollment: (courseId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
  refreshEnrollments: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

/* ─── Retry helper with exponential backoff ─── */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
): Promise<T> {
  // react-doctor-disable async-await-in-loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as Error;
      if (e?.message && /unauthorized|forbidden|JWT|invalid|duplicate/i.test(e.message)) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 300;
        console.warn(`[StudentAuth] ${label} attempt ${attempt + 1} failed, retrying in ${Math.round(delayMs)}ms`, e?.message);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        logError(err, `StudentAuth.${label}`);
        throw err;
      }
    }
  }
  throw new Error("Unreachable");
}

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>([]);
  const [progress, setProgress] = useState<Record<string, StudentModuleProgress[]>>({});

  // ─── Fetch student profile directly from Supabase ─────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const { data: { session } } = await getSharedSession();
      const user = session?.user;
      if (!user) {
        setStudent(null);
        setEnrollments([]);
        setProgress({});
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

      // Get or create student account
      let { data: studentAcc } = await supabase.from("student_accounts").select("*").eq("auth_user_id", user.id).maybeSingle();

      if (!studentAcc) {
        // Auto-create student account on first login if it doesn't exist
        const { data: newAcc, error } = await supabase.from("student_accounts").insert({
          auth_user_id: user.id,
          email: user.email || "",
          name: profile?.full_name || user.email || "Student",
          must_change_password: false
        }).select().maybeSingle();
        
        if (!error && newAcc) {
            studentAcc = newAcc;
        }
      }

      if (!studentAcc) {
        setStudent(null);
        return;
      }

      setStudent({
        id: studentAcc.id,
        authUserId: user.id,
        email: user.email || studentAcc.email,
        name: profile?.full_name || "Student",
        grade: null,
        phone: null,
        mustChangePassword: studentAcc.must_change_password,
        isActive: studentAcc.is_active ?? true,
        createdAt: studentAcc.created_at
      });

      // Fetch enrollments
      const { data: enrollmentsData } = await supabase
        .from("learning_enrollments")
        .select("id, auth_user_id:user_id, course_id, enrolled_at, progress, completed_at, last_module_id, last_video_timestamp, courses:learning_courses(id, title, slug, description, thumbnail_url, category, difficulty_level)")
        .eq("user_id", user.id);

      setEnrollments((enrollmentsData as unknown as StudentCourseEnrollment[]) || []);

      // Fetch progress
      const { data: progressData } = await supabase
        .from("learning_progress")
        .select("*")
        .eq("user_id", user.id);

      const progMap: Record<string, StudentModuleProgress[]> = {};
      if (progressData) {
        progressData.forEach(p => {
          if (!progMap[p.course_id]) progMap[p.course_id] = [];
          progMap[p.course_id].push({ ...p, auth_user_id: p.user_id } as any);
        });
      }
      setProgress(progMap);

    } catch (err) {
      logError(err, "StudentAuth.fetchProfile");
      setStudent(null);
    }
  }, []);

  // ─── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    // Get initial session
    getSharedSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.access_token) {
        fetchProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.access_token) {
          await fetchProfile();
        } else {
          setStudent(null);
          setEnrollments([]);
          setProgress({});
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ─── Sign In ──────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
      options: turnstileToken ? { captchaToken: turnstileToken } : undefined,
    });
    if (error) {
      if (error.message?.includes("Invalid login credentials")) {
        throw new Error("Invalid email or password. Please try again.");
      }
      throw error;
    }
  }, []);

  // ─── Sign Out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setStudent(null);
    setSession(null);
    setEnrollments([]);
    setProgress({});
  }, []);

  // ─── Change Password ─────────────────────────────────────────────────────
  const changePassword = useCallback(async (newPassword: string) => {
    if (!session?.access_token) throw new Error("Not authenticated");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    // Update local state
    if (student) {
      await supabase.from("student_accounts").update({ must_change_password: false }).eq("auth_user_id", session.user.id);
      setStudent({ ...student, mustChangePassword: false });
    }
  }, [session, student]);

  // ─── Enroll In Course ─────────────────────────────────────────────────────
  const enrollInCourse = useCallback(async (courseId: string) => {
    if (!session?.user?.id) throw new Error("Not authenticated");

    const { error } = await supabase.from("learning_enrollments").insert({
      user_id: session.user.id,
      course_id: courseId
    });

    if (error && error.code !== "23505") { // Ignore unique constraint violations (already enrolled)
      throw new Error(error.message || "Failed to enroll");
    }

    // Refresh enrollments
    await fetchProfile();
  }, [session, fetchProfile]);

  // ─── Update Module Progress ───────────────────────────────────────────────
  const updateModuleProgress = useCallback(async (courseId: string, moduleId: string, isCompleted: boolean) => {
    if (!session?.user?.id) return;

    await withRetry(async () => {
      const { data, error } = await supabase
        .from("learner_progress")
        .upsert({
          auth_user_id: session.user.id,
          course_id: courseId,
          module_id: moduleId,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update local progress
      const courseProgress = progress[courseId] || [];
      const updated = [
        ...courseProgress.filter((p) => p.module_id !== moduleId),
        data as unknown as StudentModuleProgress,
      ];
      setProgress((prev) => ({ ...prev, [courseId]: updated }));
    }, "updateModuleProgress");

    // Also track as last module
    await updateLastModule(courseId, moduleId).catch(() => {});

    // Refresh enrollments for updated progress %
    await fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, progress, fetchProfile]);

  // ─── Game-save: Track last module ─────────────────────────────────────────
  const updateLastModule = useCallback(async (courseId: string, moduleId: string, videoTimestamp?: number) => {
    // Instant local save
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

    // Persist to server (best-effort)
    if (!session?.user?.id) return;
    try {
      const updatePayload: any = { last_module_id: moduleId };
      if (videoTimestamp !== undefined) updatePayload.last_video_timestamp = videoTimestamp;
      await (supabase.from("learner_course_enrollments").update(updatePayload) as any)
        .eq("auth_user_id", session.user.id)
        .eq("course_id", courseId);
    } catch {
      // Best-effort: localStorage already has the data
    }
  }, [session]);

  // ─── Get last module + video timestamp ────────────────────────────────────
  const getLastModule = useCallback((courseId: string): { moduleId: string | null; timestamp: number } => {
    // Try localStorage first
    try {
      const localData = JSON.parse(localStorage.getItem(LAST_MODULE_KEY) || "{}");
      const moduleId = localData[courseId] || null;
      if (moduleId) {
        const tsData = JSON.parse(localStorage.getItem(LAST_TIMESTAMP_KEY) || "{}");
        const timestamp = tsData[`${courseId}:${moduleId}`] || 0;
        return { moduleId, timestamp };
      }
    } catch { /* fallthrough */ }

    // Fall back to enrollment data
    const enrollment = enrollments.find((e) => e.course_id === courseId);
    return {
      moduleId: enrollment?.last_module_id || null,
      timestamp: enrollment?.last_video_timestamp || 0,
    };
  }, [enrollments]);

  const checkCourseEnrollment = useCallback((courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  }, [enrollments]);

  const getCourseProgress = useCallback((courseId: string) => {
    const enrollment = enrollments.find((e) => e.course_id === courseId);
    return enrollment?.progress || 0;
  }, [enrollments]);

  const refreshEnrollments = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const contextValue = useMemo(() => ({
    student,
    session,
    loading,
    isAuthenticated: !!student && !!session,
    mustChangePassword: student?.mustChangePassword ?? false,
    enrollments,
    progress,
    signIn,
    signOut,
    changePassword,
    enrollInCourse,
    updateModuleProgress,
    updateLastModule,
    getLastModule,
    checkCourseEnrollment,
    getCourseProgress,
    refreshEnrollments,
    refreshProfile,
  }), [student, session, loading, enrollments, progress, signIn, signOut, changePassword, enrollInCourse, updateModuleProgress, updateLastModule, getLastModule, checkCourseEnrollment, getCourseProgress, refreshEnrollments, refreshProfile]);

  return (
    <StudentAuthContext.Provider
      value={contextValue}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) throw new Error("useStudentAuth must be used within StudentAuthProvider");
  return context;
};
