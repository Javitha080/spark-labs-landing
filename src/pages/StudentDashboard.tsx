import { Link, useNavigate } from "react-router-dom";
import { useStudentAuth } from "@/context/StudentAuthContext";
import { useGamification } from "@/context/GamificationContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const {
    student,
    enrollments,
    signOut,
    getLastModule,
  } = useStudentAuth();
  const { stats } = useGamification();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  // Find last active course for quick resume
  const lastActiveCourse = enrollments.find((e) => {
    const last = getLastModule(e.course_id);
    return last.moduleId !== null;
  });

  return (
    <>
      <SEOHead
        title="Dashboard | SPARK Labs Student Portal"
        description="Your SPARK Labs learning dashboard — track progress, manage courses, and continue your learning journey."
        path="/student/dashboard"
        noindex
      />
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Welcome Banner */}
          <div className="relative mb-8 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border border-primary/10 overflow-hidden">
            <div className="absolute -top-10 -right-10 size-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 size-40 bg-secondary/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
                  Welcome back, <span className="text-primary">{student?.name || "Student"}</span>! 👋
                </h1>
                <p className="text-muted-foreground">
                  {student?.grade ? `${student.grade} • ` : ""}{student?.email}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/student/change-password")}
                  className="gap-1.5 rounded-xl"
                >
                  <Settings className="size-4" />
                  Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1.5 rounded-xl text-destructive hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <Card className="border-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-black">{enrollments.length}</p>
                  <p className="text-xs text-muted-foreground">Courses</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Zap className="size-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{stats?.total_xp || 0}</p>
                  <p className="text-xs text-muted-foreground">XP Earned</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Flame className="size-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">{stats?.current_streak_days || 0}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Trophy className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-black">
                    {enrollments.filter((e) => e.progress >= 100).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Resume */}
          {lastActiveCourse && (
            <Card className="mb-8 border-secondary/20 shadow-lg shadow-secondary/5">
              <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-md">
                    <Play className="size-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider">Resume Learning</p>
                    <p className="font-bold text-lg">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(lastActiveCourse as any).courses?.title || "Course"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={lastActiveCourse.progress || 0} className="h-1.5 w-32" />
                      <span className="text-xs text-muted-foreground">{lastActiveCourse.progress || 0}%</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/learning-hub/classroom/${lastActiveCourse.course_id}`)}
                  className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 rounded-xl font-bold gap-2 shadow-md"
                >
                  <Play className="size-4" />
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Enrolled Courses */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" />
                My Courses
              </h2>
              <Link
                to="/learning-hub"
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                Browse More
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <Card className="border-dashed border-2 border-muted-foreground/20">
                <CardContent className="p-10 text-center">
                  <Sparkles className="size-12 text-muted-foreground/40 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your learning journey by exploring our course catalog!
                  </p>
                  <Button
                    onClick={() => navigate("/learning-hub")}
                    className="bg-gradient-to-r from-primary to-secondary rounded-xl font-bold gap-2"
                  >
                    <BookOpen className="size-4" />
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {enrollments.map((enrollment) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const course = (enrollment as any).courses;
                  const progressPct = enrollment.progress || 0;
                  const isCompleted = progressPct >= 100;

                  return (
                    <Card
                      key={enrollment.id}
                      className={`group hover:shadow-lg transition-all cursor-pointer ${
                        isCompleted ? "border-emerald-500/20" : "border-primary/10"
                      }`}
                      onClick={() => navigate(`/learning-hub/classroom/${enrollment.course_id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {course?.thumbnail_url ? (
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="size-16 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="size-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="size-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                              {course?.title || "Course"}
                            </h3>
                            {course?.category && (
                              <p className="text-xs text-muted-foreground mt-0.5">{course.category}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Progress
                                value={progressPct}
                                className={`h-1.5 flex-1 ${isCompleted ? "[&>div]:bg-emerald-500" : ""}`}
                              />
                              <span className={`text-xs font-bold ${isCompleted ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {isCompleted ? "✓ Done" : `${progressPct}%`}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
