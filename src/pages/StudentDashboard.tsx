import { Link, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { useGamification } from "@/context/GamificationContext";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  BookOpen,
  Trophy,
  Flame,
  ArrowRight,
  LogOut,
  Settings,
  Play,
  Sparkles,
  Zap,
  CheckCircle,
  Calendar,
  Lock
} from "lucide-react";

// Helper Circular Progress Component
function CircularProgress({
  value,
  size = 56,
  strokeWidth = 5,
  colorClass = "stroke-primary",
  textColorClass = "text-foreground"
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  textColorClass?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="stroke-border/30"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`progress-ring-circle ${colorClass}`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <span className={`absolute text-[10px] font-black ${textColorClass}`}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { student, enrollments, signOut, getLastModule } = useStudentAuth();
  const { stats, achievements } = useGamification();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  // Find last active course for quick resume
  const lastActiveCourse = enrollments.find((e) => {
    const last = getLastModule(e.course_id);
    return last.moduleId !== null;
  });

  // Calculate dynamic greeting based on current local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Student Initials for Avatar
  const getInitials = (name: string) => {
    if (!name) return "S";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <SEOHead
        title="Dashboard | SPARK Labs Student Portal"
        description="Your SPARK Labs learning dashboard — track progress, manage courses, and continue your learning journey."
        path="/student/dashboard"
        noindex
      />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-20 relative overflow-hidden">
        {/* Animated dot grid underlay */}
        <div className="absolute inset-0 student-grid-bg opacity-30 pointer-events-none" />

        {/* Ambient neon backdrop blobs */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-5xl relative z-10 stagger-in">
          <Breadcrumbs />

          {/* 1. Header Welcome Banner */}
          <div className="relative mb-8 p-6 md:p-8 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl overflow-hidden liquid-glass shadow-lg">
            <div className="absolute inset-0 student-grid-bg opacity-20 pointer-events-none" />
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {/* Visual Avatar with Gradient Ring */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary via-accent to-secondary p-[2px] shadow-lg shadow-primary/15 flex-shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-card flex items-center justify-center font-display font-black text-xl text-primary">
                    {getInitials(student?.name || "Student")}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight mb-0.5">
                    {getGreeting()},{" "}
                    <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                      {student?.name || "Explorer"}
                    </span>
                    ! 🚀
                  </h1>
                  <p className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-2">
                    {student?.grade && (
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground/70">
                        {student.grade}
                      </span>
                    )}
                    <span>{student?.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/student/change-password")}
                  className="gap-1.5 rounded-xl border-border/40 hover:border-primary/30 transition-all font-semibold"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1.5 rounded-xl border-border/40 hover:border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/5 transition-all font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Stats Grid Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Courses Card */}
            <Card
              className="stat-orb border-border/30 bg-card/30 backdrop-blur-md rounded-2xl"
              style={{ "--orb-color": "rgba(99, 102, 241, 0.15)" } as React.CSSProperties}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Courses</p>
                  <p className="text-3xl font-display font-black text-indigo-400">{enrollments.length}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
              </CardContent>
            </Card>

            {/* Total XP Card */}
            <Card
              className="stat-orb border-border/30 bg-card/30 backdrop-blur-md rounded-2xl"
              style={{ "--orb-color": "rgba(245, 158, 11, 0.15)" } as React.CSSProperties}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">XP Earned</p>
                  <p className="text-3xl font-display font-black text-amber-500">{stats?.total_xp || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            <Card
              className="stat-orb border-border/30 bg-card/30 backdrop-blur-md rounded-2xl"
              style={{ "--orb-color": "rgba(249, 115, 22, 0.15)" } as React.CSSProperties}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Day Streak</p>
                  <p className="text-3xl font-display font-black text-orange-500">{stats?.current_streak_days || 0}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                </div>
              </CardContent>
            </Card>

            {/* Finished Courses Card */}
            <Card
              className="stat-orb border-border/30 bg-card/30 backdrop-blur-md rounded-2xl"
              style={{ "--orb-color": "rgba(16, 185, 129, 0.15)" } as React.CSSProperties}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-3xl font-display font-black text-emerald-500">
                    {enrollments.filter((e) => e.progress >= 100).length}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. Quick Resume Panel */}
          {lastActiveCourse && (
            <Card className="mb-8 border-accent/20 bg-card/30 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-secondary to-accent" />
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  {/* Thumbnail / Symbol */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-lg shadow-accent/10 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-secondary uppercase tracking-widest mb-0.5">
                      Continue Learning
                    </p>
                    <h3 className="font-display font-black text-base md:text-lg tracking-tight truncate max-w-sm md:max-w-md">
                      {(lastActiveCourse as any).courses?.title || "Course"}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Progress value={lastActiveCourse.progress || 0} className="h-1.5 w-28 md:w-36 bg-border/40" />
                      <span className="text-[10px] font-extrabold text-muted-foreground">
                        {lastActiveCourse.progress || 0}% Completed
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/learning-hub/classroom/${lastActiveCourse.course_id}`)}
                  className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/95 hover:to-accent/95 text-white font-bold rounded-xl px-5 py-5 text-xs tracking-wider gap-2 btn-shimmer flex-shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Resume Workshop
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 4. Enrolled Courses Bento Grid */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-display font-black tracking-tight flex items-center gap-2 text-glow">
                <GraduationCap className="w-5 h-5 text-primary" />
                Active Workshops
              </h2>
              <Link
                to="/learning-hub"
                className="text-xs text-primary hover:text-accent font-bold flex items-center gap-1 transition-colors underline decoration-primary/20 hover:decoration-accent/60 underline-offset-4"
              >
                Browse Academy catalog
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50 bg-card/10 rounded-2xl">
                <CardContent className="p-12 text-center max-w-sm mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/30 flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                    <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-display font-black text-lg mb-1.5">No workshops enrolled</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                    Enter the academy catalog to choose your track, build real project files, and earn XP.
                  </p>
                  <Button
                    onClick={() => navigate("/learning-hub")}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-bold text-xs tracking-wider px-5 py-4 rounded-xl shadow-md btn-shimmer"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-2" />
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {enrollments.map((enrollment) => {
                  const course = (enrollment as any).courses;
                  const progressPct = enrollment.progress || 0;
                  const isCompleted = progressPct >= 100;

                  return (
                    <Card
                      key={enrollment.id}
                      className={`course-card-glow cursor-pointer border-border/30 bg-card/20 backdrop-blur-md rounded-2xl overflow-hidden relative group`}
                      onClick={() => navigate(`/learning-hub/classroom/${enrollment.course_id}`)}
                    >
                      <CardContent className="p-4 flex gap-4">
                        {/* Course Thumbnail */}
                        {course?.thumbnail_url ? (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border/20 shadow-sm relative">
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <BookOpen className="w-7 h-7 text-primary/70" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary/80">
                                {course?.category || "STEM"}
                              </span>
                              {isCompleted && (
                                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <h3 className="font-display font-black text-sm text-foreground group-hover:text-primary transition-colors truncate mt-1">
                              {course?.title || "Workshop Track"}
                            </h3>
                          </div>

                          {/* Progress Circle & Status */}
                          <div className="flex items-center justify-between gap-3 mt-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span className="font-black text-foreground">{progressPct}%</span>
                              </div>
                              <Progress
                                value={progressPct}
                                className={`h-1.5 ${isCompleted ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"}`}
                              />
                            </div>
                            <CircularProgress
                              value={progressPct}
                              size={38}
                              strokeWidth={3.5}
                              colorClass={isCompleted ? "stroke-emerald-500" : "stroke-primary"}
                              textColorClass="text-[8px] font-extrabold"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Achievements Showcase Shelf */}
          {achievements.length > 0 && (
            <div className="border-t border-border/30 pt-8">
              <h2 className="text-lg font-display font-black tracking-tight flex items-center gap-2 text-glow mb-5">
                <Trophy className="w-5 h-5 text-amber-500" />
                Workshop Badges
              </h2>
              
              <div className="achievement-scroll">
                {achievements.map((achievement) => {
                  const definition = ACHIEVEMENT_DEFINITIONS[achievement.achievement_type];
                  if (!definition) return null;

                  return (
                    <div
                      key={achievement.id}
                      className="flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl border border-border/30 bg-card/20 backdrop-blur-md w-32 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-amber-500/5 border border-amber-500/20 flex items-center justify-center text-2xl mb-2.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        {definition.icon}
                      </div>
                      <span className="text-[10px] font-black text-center text-foreground truncate w-full">
                        {definition.label}
                      </span>
                      <span className="text-[8px] font-extrabold text-amber-500/90 mt-1 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">
                        +{definition.xp} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
