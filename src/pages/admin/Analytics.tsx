import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, TrendingUp, Users, Calendar, Eye, Sun, Moon, Coffee,
  Sparkles, FileText, Image, FolderOpen, UserCheck, Clock, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Target, Award,
  PieChart, Layers, Bell, CheckCircle2, XCircle, AlertCircle
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { format, subDays, isToday, isYesterday, parseISO } from "date-fns";

interface Analytics {
  totalEnrollments: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  rejectedEnrollments: number;
  totalEvents: number;
  upcomingEvents: number;
  totalProjects: number;
  featuredProjects: number;
  totalTeamMembers: number;
  totalBlogPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalGalleryItems: number;
  recentActivity: Tables<"analytics_events">[];
  enrollmentsByInterest: Record<string, number>;
  enrollmentsByGrade: Record<string, number>;
  recentEnrollments: Array<{
    name: string;
    email: string;
    interest: string;
    status: string;
    created_at: string;
  }>;
  todayEnrollments: number;
  weekEnrollments: number;
}

const Analytics = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Data refresh effect (polls every 30 seconds)
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Auto-update every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).single()
      ]);
      if (profileRes.data?.full_name) {
        setUserName(profileRes.data.full_name);
      }
      if (roleRes.data?.role) {
        setUserRole(roleRes.data.role);
      }
    }
  };

  const fetchAnalytics = async () => {
    try {
      let enrollmentQuery = supabase.from("enrollment_submissions").select("*");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = subDays(new Date(), 7);

      if (timeRange !== "all") {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const since = subDays(new Date(), days);
        enrollmentQuery = enrollmentQuery.gte("created_at", since.toISOString());
      }

      const [
        enrollmentsRes,
        eventsRes,
        upcomingEventsRes,
        projectsRes,
        featuredProjectsRes,
        teamRes,
        analyticsRes,
        blogRes,
        publishedBlogRes,
        galleryRes,
        todayEnrollmentsRes,
        weekEnrollmentsRes
      ] = await Promise.all([
        enrollmentQuery,
        supabase.from("events").select("id", { count: 'exact', head: true }),
        supabase.from("events").select("id", { count: 'exact', head: true }).gte("event_date", new Date().toISOString().split('T')[0]),
        supabase.from("projects").select("id", { count: 'exact', head: true }),
        supabase.from("projects").select("id", { count: 'exact', head: true }).eq("is_featured", true),
        supabase.from("team_members").select("id", { count: 'exact', head: true }),
        supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("blog_posts").select("id", { count: 'exact', head: true }),
        supabase.from("blog_posts").select("id", { count: 'exact', head: true }).eq("status", "published"),
        supabase.from("gallery_items").select("id", { count: 'exact', head: true }),
        supabase.from("enrollment_submissions").select("id", { count: 'exact', head: true }).gte("created_at", today.toISOString()),
        supabase.from("enrollment_submissions").select("id", { count: 'exact', head: true }).gte("created_at", weekAgo.toISOString())
      ]);

      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const enrollments = enrollmentsRes.data || [];

      const enrollmentsByInterest = enrollments.reduce((acc, e) => {
        acc[e.interest] = (acc[e.interest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const enrollmentsByGrade = enrollments.reduce((acc, e) => {
        acc[e.grade] = (acc[e.grade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentEnrollments = enrollments
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(e => ({
          name: e.name,
          email: e.email,
          interest: e.interest,
          status: e.status || 'pending',
          created_at: e.created_at
        }));

      setAnalytics({
        totalEnrollments: enrollments.length,
        pendingEnrollments: enrollments.filter(e => e.status === "pending").length,
        approvedEnrollments: enrollments.filter(e => e.status === "approved").length,
        rejectedEnrollments: enrollments.filter(e => e.status === "rejected").length,
        totalEvents: eventsRes.count || 0,
        upcomingEvents: upcomingEventsRes.count || 0,
        totalProjects: projectsRes.count || 0,
        featuredProjects: featuredProjectsRes.count || 0,
        totalTeamMembers: teamRes.count || 0,
        totalBlogPosts: blogRes.count || 0,
        publishedPosts: publishedBlogRes.count || 0,
        draftPosts: (blogRes.count || 0) - (publishedBlogRes.count || 0),
        totalGalleryItems: galleryRes.count || 0,
        recentActivity: analyticsRes.data || [],
        enrollmentsByInterest,
        enrollmentsByGrade,
        recentEnrollments,
        todayEnrollments: todayEnrollmentsRes.count || 0,
        weekEnrollments: weekEnrollmentsRes.count || 0
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;
  if (!analytics) return <div className="p-8">No data available</div>;

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return <Sun className="w-8 h-8 text-orange-400" />;
    if (hour < 18) return <Coffee className="w-8 h-8 text-amber-600" />;
    return <Moon className="w-8 h-8 text-indigo-400" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const totalInterests = Object.values(analytics.enrollmentsByInterest).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Hero Welcome Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-6 md:p-10 border border-border/50 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] -z-10" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <Calendar className="w-4 h-4" />
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
              <Badge variant="outline" className="ml-2 capitalize">{userRole || 'Admin'}</Badge>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {getGreeting()}
              </span>
              <span className="text-foreground">, {userName ? userName.split(' ')[0] : 'Admin'}!</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Here's your club overview. You have <span className="text-primary font-semibold">{analytics.pendingEnrollments}</span> pending enrollments
              and <span className="text-primary font-semibold">{analytics.upcomingEvents}</span> upcoming events.
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button variant="outline" className="gap-2" asChild>
                <a href="/admin/enrollments">
                  <Bell className="w-4 h-4" />
                  View Enrollments
                </a>
              </Button>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-border/50 flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-6 transition-all duration-300">
              {getTimeIcon()}
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{format(currentTime, 'h:mm:ss')}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{format(currentTime, 'a')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Today's Enrollments</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">{analytics.todayEnrollments}</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-green-500">
              <ArrowUpRight className="w-3 h-3" />
              <span>{analytics.weekEnrollments} this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Pending Review</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">{analytics.pendingEnrollments}</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>Needs attention</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Approved</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">{analytics.approvedEnrollments}</p>
              </div>
              <div className="p-3 rounded-2xl bg-green-500/10">
                <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-green-500">
              <Award className="w-3 h-3" />
              <span>{analytics.totalEnrollments > 0 ? Math.round((analytics.approvedEnrollments / analytics.totalEnrollments) * 100) : 0}% approval rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Upcoming Events</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground mt-1">{analytics.upcomingEvents}</p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-500/10">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>{analytics.totalEvents} total events</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Analytics Overview</h2>
            <p className="text-sm text-muted-foreground">Detailed insights and metrics</p>
          </div>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <Layers className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="gap-2">
            <Users className="w-4 h-4" />
            Enrollments
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <FileText className="w-4 h-4" />
            Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalEnrollments}</div>
                <div className="text-xs text-muted-foreground">Total Enrollments</div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalEvents}</div>
                <div className="text-xs text-muted-foreground">Events</div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <FolderOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalProjects}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalBlogPosts}</div>
                <div className="text-xs text-muted-foreground">Blog Posts</div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Image className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalGalleryItems}</div>
                <div className="text-xs text-muted-foreground">Gallery Items</div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Award className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{analytics.totalTeamMembers}</div>
                <div className="text-xs text-muted-foreground">Team Members</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Latest user interactions and page views</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {analytics.recentActivity.length > 0 ? (
                    analytics.recentActivity.map((event, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Eye className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{event.event_type}</div>
                          <div className="text-xs text-muted-foreground truncate">{event.page_url}</div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {event.created_at ? formatRelativeTime(event.created_at) : 'Unknown'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No recent activity recorded</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interest Distribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  <CardTitle>Interest Distribution</CardTitle>
                </div>
                <CardDescription>What areas students are interested in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.enrollmentsByInterest)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([interest, count], index) => {
                      const percentage = totalInterests > 0 ? ((count as number) / totalInterests) * 100 : 0;
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                      return (
                        <div key={interest} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{interest}</span>
                            <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  {Object.keys(analytics.enrollmentsByInterest).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No enrollment data yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grade Distribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <CardTitle>Grade Distribution</CardTitle>
                </div>
                <CardDescription>Enrollment distribution by grade level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.enrollmentsByGrade)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([grade, count]) => {
                      const percentage = analytics.totalEnrollments > 0 ? ((count as number) / analytics.totalEnrollments) * 100 : 0;
                      return (
                        <div key={grade} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{grade}</span>
                            <span className="text-muted-foreground">{count} students</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  {Object.keys(analytics.enrollmentsByGrade).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No grade data yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Enrollments */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Recent Enrollments</CardTitle>
              </div>
              <CardDescription>Latest student applications</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {analytics.recentEnrollments.map((enrollment, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                        {enrollment.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{enrollment.name}</div>
                        <div className="text-sm text-muted-foreground truncate">{enrollment.email}</div>
                      </div>
                      <div className="hidden sm:block">
                        <Badge variant="secondary">{enrollment.interest}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(enrollment.status)}
                        <span className="text-xs capitalize hidden sm:inline">{enrollment.status}</span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap hidden md:block">
                        {formatRelativeTime(enrollment.created_at)}
                      </div>
                    </div>
                  ))}
                  {analytics.recentEnrollments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No enrollments yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <Badge variant="outline">{analytics.publishedPosts} published</Badge>
                </div>
                <div className="text-3xl font-bold">{analytics.totalBlogPosts}</div>
                <div className="text-sm text-muted-foreground">Total Blog Posts</div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {analytics.draftPosts} drafts pending
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <FolderOpen className="w-8 h-8 text-green-500" />
                  <Badge variant="outline">{analytics.featuredProjects} featured</Badge>
                </div>
                <div className="text-3xl font-bold">{analytics.totalProjects}</div>
                <div className="text-sm text-muted-foreground">Total Projects</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Image className="w-8 h-8 text-purple-500" />
                </div>
                <div className="text-3xl font-bold">{analytics.totalGalleryItems}</div>
                <div className="text-sm text-muted-foreground">Gallery Items</div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Calendar className="w-8 h-8 text-orange-500" />
                  <Badge variant="outline">{analytics.upcomingEvents} upcoming</Badge>
                </div>
                <div className="text-3xl font-bold">{analytics.totalEvents}</div>
                <div className="text-sm text-muted-foreground">Total Events</div>
              </CardContent>
            </Card>
          </div>

          {/* Content Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Quick overview of your content status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Blog Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Published</span>
                      <span className="text-green-500">{analytics.publishedPosts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Drafts</span>
                      <span className="text-yellow-500">{analytics.draftPosts}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> Projects
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Featured</span>
                      <span className="text-primary">{analytics.featuredProjects}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Regular</span>
                      <span>{analytics.totalProjects - analytics.featuredProjects}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> Team
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Members</span>
                      <span>{analytics.totalTeamMembers}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
