// react-doctor-disable no-react19-deprecated-apis
import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase, getSharedSession } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";
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
  courses?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnail_url: string;
    category: string;
    level: string;
  };
}

export interface StudentModuleProgress {
  id: string;
  auth_user_id: string;
  course_id: string;
  module_id: string;
  is_completed: boolean;
  completed_at: string | null;
  last_position?: number | null;
  updated_at?: string | null;
}

export interface StudentSessionContextType {
  student: StudentProfile | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
}

export interface StudentLearningContextType {
  enrollments: StudentCourseEnrollment[];
  progress: Record<string, StudentModuleProgress[]>;
  getLastModule: (courseId: string) => { moduleId: string | null; timestamp: number };
  checkCourseEnrollment: (courseId: string) => boolean;
  getCourseProgress: (courseId: string) => number;
}

export interface StudentActionsContextType {
  signIn: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  enrollInCourse: (courseId: string) => Promise<void>;
  updateModuleProgress: (courseId: string, moduleId: string, completed: boolean) => Promise<void>;
  updateLastModule: (courseId: string, moduleId: string, timestamp?: number) => Promise<void>;
  refreshEnrollments: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

type StudentAuthContextType = StudentSessionContextType &
  StudentLearningContextType &
  StudentActionsContextType;

const StudentSessionContext = createContext<StudentSessionContextType | undefined>(undefined);
const StudentLearningContext = createContext<StudentLearningContextType | undefined>(undefined);
const StudentActionsContext = createContext<StudentActionsContextType | undefined>(undefined);

function isSameStudentProfile(a: StudentProfile | null, b: StudentProfile): boolean {
  if (!a) return false;
  return (
    a.id === b.id &&
    a.authUserId === b.authUserId &&
    a.email === b.email &&
    a.name === b.name &&
    a.grade === b.grade &&
    a.phone === b.phone &&
    a.mustChangePassword === b.mustChangePassword &&
    a.isActive === b.isActive &&
    a.createdAt === b.createdAt
  );
}

function isSameEnrollments(
  prev: StudentCourseEnrollment[],
  next: StudentCourseEnrollment[],
): boolean {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    if (
      prev[i].id !== next[i].id ||
      prev[i].course_id !== next[i].course_id ||
      prev[i].progress !== next[i].progress ||
      prev[i].completed_at !== next[i].completed_at
    ) {
      return false;
    }
  }
  return true;
}

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
        await new Promise((r) => setTimeout(r, delayMs));
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

  const loadedUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const studentRef = useRef<StudentProfile | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  const refreshEnrollmentsOnly = useCallback(async (userId?: string) => {
    const uid = userId ?? sessionRef.current?.user?.id;
    if (!uid) return;
    try {
      const { data, error } = await supabase
        .from("learning_enrollments")
        .select(
          "id, auth_user_id:user_id, course_id, enrolled_at, progress, completed_at, courses:learning_courses(id, title, slug, description, thumbnail_url, category, level)"
        )
        .eq("user_id", uid);
      if (error) throw error;
      const next = (data as unknown as StudentCourseEnrollment[]) || [];
      setEnrollments((prev) => (isSameEnrollments(prev, next) ? prev : next));
    } catch (err) {
      logError(err, "StudentAuth.refreshEnrollmentsOnly");
    }
  }, []);

  // ─── Fetch student profile directly from Supabase ─────────────────────────
  const fetchProfile = useCallback(async (existingSession?: Session | null) => {
    try {
      const activeSession =
        existingSession !== undefined
          ? existingSession
          : (await getSharedSession()).data.session;
      const user = activeSession?.user;
      if (!user) {
        loadedUserIdRef.current = null;
        setStudent(null);
        setEnrollments((prev) => (prev.length === 0 ? prev : []));
        setProgress((prev) => (Object.keys(prev).length === 0 ? prev : {}));
        return;
      }

      const [profileRes, accountRes, enrollmentsRes, progressRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("student_accounts").select("*").eq("auth_user_id", user.id).maybeSingle(),
        supabase
          .from("learning_enrollments")
          .select("id, auth_user_id:user_id, course_id, enrolled_at, progress, completed_at, courses:learning_courses(id, title, slug, description, thumbnail_url, category, level)")
          .eq("user_id", user.id),
        supabase.from("learning_progress").select("*").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      let studentAcc = accountRes.data;

      if (!studentAcc) {
        const { data: newAcc, error } = await supabase
          .from("student_accounts")
          .insert({
            auth_user_id: user.id,
            email: user.email || "",
            name: profile?.full_name || user.email || "Student",
            must_change_password: false,
          })
          .select()
          .maybeSingle();

        if (!error && newAcc) {
          studentAcc = newAcc;
        }
      }

      if (!studentAcc) {
        loadedUserIdRef.current = null;
        setStudent(null);
        return;
      }

      if (studentAcc.is_active === false) {
        loadedUserIdRef.current = null;
        setStudent(null);
        setEnrollments([]);
        setProgress({});
        setTimeout(() => { void supabase.auth.signOut(); }, 0);
        return;
      }

      const nextProfile: StudentProfile = {
        id: studentAcc.id,
        authUserId: user.id,
        email: user.email || studentAcc.email,
        name: profile?.full_name || "Student",
        grade: null,
        phone: null,
        mustChangePassword: studentAcc.must_change_password,
        isActive: studentAcc.is_active ?? true,
        createdAt: studentAcc.created_at,
      };
      setStudent((prev) => (isSameStudentProfile(prev, nextProfile) ? prev : nextProfile));

      const nextEnrollments = (enrollmentsRes.data as unknown as StudentCourseEnrollment[]) || [];
      setEnrollments((prev) => (isSameEnrollments(prev, nextEnrollments) ? prev : nextEnrollments));

      const progMap: Record<string, StudentModuleProgress[]> = {};
      progressRes.data?.forEach((p) => {
        if (!progMap[p.course_id]) progMap[p.course_id] = [];
        progMap[p.course_id].push({ ...p, auth_user_id: p.user_id } as unknown as StudentModuleProgress);
      });
      setProgress(progMap);
      loadedUserIdRef.current = user.id;
    } catch (err) {
      logError(err, "StudentAuth.fetchProfile");
      const maybeErr = err as { status?: number; message?: string };
      const isAuthFailure =
        maybeErr?.status === 401 ||
        (typeof maybeErr?.message === "string" &&
          maybeErr.message.includes("Auth session missing!"));
      if (isAuthFailure) {
        loadedUserIdRef.current = null;
        setStudent(null);
        setEnrollments([]);
        setProgress({});
      }
    }
  }, []);

  // ─── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    getSharedSession().then(({ data: { session: s } }) => {
      sessionRef.current = s;
      setSession((prev) =>
        prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token ? prev : s
      );
      if (s?.access_token) {
        fetchProfile(s).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      sessionRef.current = s;
      setSession((prev) =>
        prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token ? prev : s
      );
      if (s?.access_token) {
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
        if (event === "SIGNED_IN" && loadedUserIdRef.current === s.user?.id) return;
        setTimeout(() => { void fetchProfile(s); }, 0);
      } else {
        loadedUserIdRef.current = null;
        setStudent(null);
        setEnrollments([]);
        setProgress({});
        setTimeout(() => { queryClient.clear(); }, 0);
      }
    });

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
    loadedUserIdRef.current = null;
    sessionRef.current = null;
    studentRef.current = null;
    setStudent(null);
    setSession(null);
    setEnrollments([]);
    setProgress({});
    queryClient.clear();
  }, []);

  // ─── Change Password ─────────────────────────────────────────────────────
  const changePassword = useCallback(async (newPassword: string) => {
    const activeSession = sessionRef.current;
    const activeStudent = studentRef.current;
    if (!activeSession?.access_token) throw new Error("Not authenticated");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    if (activeStudent) {
      await supabase
        .from("student_accounts")
        .update({ must_change_password: false })
        .eq("auth_user_id", activeSession.user.id);
      setStudent((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
    }
  }, []);

  // ─── Enroll In Course ─────────────────────────────────────────────────────
  // Never set completed_at from the client — DB trigger manages course completion.
  const enrollInCourse = useCallback(async (courseId: string) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const { error } = await supabase.from("learning_enrollments").insert({
      user_id: userId,
      course_id: courseId,
    });

    if (error && error.code !== "23505") {
      throw new Error(error.message || "Failed to enroll");
    }

    await refreshEnrollmentsOnly(userId);
  }, [refreshEnrollmentsOnly]);

  // ─── Game-save: Track last module ─────────────────────────────────────────
  const updateLastModule = useCallback(async (courseId: string, moduleId: string, videoTimestamp?: number) => {
    try {
      const localData = JSON.parse(localStorage.getItem(LAST_MODULE_KEY) || "{}");
      localData[courseId] = moduleId;
      localStorage.setItem(LAST_MODULE_KEY, JSON.stringify(localData));

      if (videoTimestamp !== undefined) {
        const tsData = JSON.parse(localStorage.getItem(LAST_TIMESTAMP_KEY) || "{}");
        tsData[`${courseId}:${moduleId}`] = videoTimestamp;
        localStorage.setItem(LAST_TIMESTAMP_KEY, JSON.stringify(tsData));
      }
    } catch { /* localStorage quota exceeded - non-critical */ }

    if (videoTimestamp !== undefined && Number.isFinite(videoTimestamp) && videoTimestamp >= 0) {
      const { data: { session: s } } = await getSharedSession();
      if (!s?.user) return;
      await supabase
        .from("learning_progress")
        .update({ last_position: Math.round(videoTimestamp) })
        .eq("user_id", s.user.id)
        .eq("module_id", moduleId);
    }
  }, []);

  // ─── Update Module Progress ───────────────────────────────────────────────
  const updateModuleProgress = useCallback(async (courseId: string, moduleId: string, isCompleted: boolean) => {
    const userId = sessionRef.current?.user?.id;
    if (!userId) return;

    await withRetry(async () => {
      const { data, error } = await supabase
        .from("learning_progress")
        .upsert(
          {
            user_id: userId,
            course_id: courseId,
            module_id: moduleId,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,module_id" }
        )
        .select()
        .single();

      if (error) throw error;

      setProgress((prev) => ({
        ...prev,
        [courseId]: [
          ...(prev[courseId] || []).filter((p) => p.module_id !== moduleId),
          { ...data, auth_user_id: data.user_id } as unknown as StudentModuleProgress,
        ],
      }));
    }, "updateModuleProgress");

    await updateLastModule(courseId, moduleId).catch(() => {});

    // Refresh only learning_enrollments for updated progress % (avoids 4-table refetch)
    await refreshEnrollmentsOnly(userId);
  }, [refreshEnrollmentsOnly, updateLastModule]);

  // ─── Get last module + video timestamp ────────────────────────────────────
  const getLastModule = useCallback((courseId: string): { moduleId: string | null; timestamp: number } => {
    try {
      const localData = JSON.parse(localStorage.getItem(LAST_MODULE_KEY) || "{}");
      const moduleId = localData[courseId] || null;
      if (moduleId) {
        const tsData = JSON.parse(localStorage.getItem(LAST_TIMESTAMP_KEY) || "{}");
        const timestamp = tsData[`${courseId}:${moduleId}`] || 0;
        return { moduleId, timestamp };
      }
    } catch { /* fallthrough */ }

    const tracked = (progress[courseId] || [])
      .filter((p) => (p.last_position ?? 0) > 0)
      .reduce<(typeof progress)[string][number] | null>((latest, p) => {
        if (!latest) return p;
        return new Date(p.updated_at ?? 0) > new Date(latest.updated_at ?? 0) ? p : latest;
      }, null);
    return {
      moduleId: tracked?.module_id || null,
      timestamp: tracked?.last_position || 0,
    };
  }, [progress]);

  const checkCourseEnrollment = useCallback((courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  }, [enrollments]);

  const getCourseProgress = useCallback((courseId: string) => {
    const enrollment = enrollments.find((e) => e.course_id === courseId);
    return enrollment?.progress || 0;
  }, [enrollments]);

  const refreshEnrollments = useCallback(async () => {
    await refreshEnrollmentsOnly();
  }, [refreshEnrollmentsOnly]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const sessionValue = useMemo<StudentSessionContextType>(
    () => ({
      student,
      session,
      loading,
      isAuthenticated: !!student && !!session,
      mustChangePassword: student?.mustChangePassword ?? false,
    }),
    [student, session, loading]
  );

  const learningValue = useMemo<StudentLearningContextType>(
    () => ({
      enrollments,
      progress,
      getLastModule,
      checkCourseEnrollment,
      getCourseProgress,
    }),
    [enrollments, progress, getLastModule, checkCourseEnrollment, getCourseProgress]
  );

  const actionsValue = useMemo<StudentActionsContextType>(
    () => ({
      signIn,
      signOut,
      changePassword,
      enrollInCourse,
      updateModuleProgress,
      updateLastModule,
      refreshEnrollments,
      refreshProfile,
    }),
    [
      signIn,
      signOut,
      changePassword,
      enrollInCourse,
      updateModuleProgress,
      updateLastModule,
      refreshEnrollments,
      refreshProfile,
    ]
  );

  return (
    <StudentActionsContext.Provider value={actionsValue}>
      <StudentSessionContext.Provider value={sessionValue}>
        <StudentLearningContext.Provider value={learningValue}>
          {children}
        </StudentLearningContext.Provider>
      </StudentSessionContext.Provider>
    </StudentActionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentSession = () => {
  const context = useContext(StudentSessionContext);
  if (!context) throw new Error("useStudentSession must be used within StudentAuthProvider");
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentLearning = () => {
  const context = useContext(StudentLearningContext);
  if (!context) throw new Error("useStudentLearning must be used within StudentAuthProvider");
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentActions = () => {
  const context = useContext(StudentActionsContext);
  if (!context) throw new Error("useStudentActions must be used within StudentAuthProvider");
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useStudentAuth = (): StudentAuthContextType => {
  const sessionCtx = useStudentSession();
  const learningCtx = useStudentLearning();
  const actionsCtx = useStudentActions();
  return useMemo(
    () => ({ ...sessionCtx, ...learningCtx, ...actionsCtx }),
    [sessionCtx, learningCtx, actionsCtx]
  );
};
