import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, Calendar, Eye, MousePointerClick } from "lucide-react";
import { Loading } from "@/components/ui/loading";

interface Analytics {
  totalEnrollments: number;
  pendingEnrollments: number;
  approvedEnrollments: number;
  totalEvents: number;
  totalProjects: number;
  totalTeamMembers: number;
  recentActivity: any[];
  enrollmentsByInterest: Record<string, number>;
}

const Analytics = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      let enrollmentQuery = supabase.from("enrollment_submissions").select("*");
      
      if (timeRange !== "all") {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        enrollmentQuery = enrollmentQuery.gte("created_at", since.toISOString());
      }

      const [
        enrollmentsRes,
        eventsRes,
        projectsRes,
        teamRes,
        analyticsRes
      ] = await Promise.all([
        enrollmentQuery,
        supabase.from("events").select("count"),
        supabase.from("projects").select("count"),
        supabase.from("team_members").select("count"),
        supabase
          .from("analytics_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20)
      ]);

      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const enrollments = enrollmentsRes.data || [];
      const enrollmentsByInterest = enrollments.reduce((acc, e) => {
        acc[e.interest] = (acc[e.interest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setAnalytics({
        totalEnrollments: enrollments.length,
        pendingEnrollments: enrollments.filter(e => e.status === "pending").length,
        approvedEnrollments: enrollments.filter(e => e.status === "approved").length,
        totalEvents: eventsRes.data?.[0]?.count || 0,
        totalProjects: projectsRes.data?.[0]?.count || 0,
        totalTeamMembers: teamRes.data?.[0]?.count || 0,
        recentActivity: analyticsRes.data || [],
        enrollmentsByInterest
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading size="lg" className="h-64" />;
  if (!analytics) return <div className="p-8">No data available</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Analytics Dashboard
        </h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.pendingEnrollments} pending · {analytics.approvedEnrollments} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Active events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">Total projects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments by Interest Area</CardTitle>
          <CardDescription>Distribution of student interests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analytics.enrollmentsByInterest).map(([interest, count]) => (
              <div key={interest} className="flex items-center">
                <div className="w-32 font-medium">{interest}</div>
                <div className="flex-1">
                  <div className="h-8 bg-primary/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary flex items-center justify-end pr-2 text-xs text-primary-foreground"
                      style={{ width: `${(count / analytics.totalEnrollments) * 100}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest user interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{event.event_type}</div>
                  <div className="text-xs text-muted-foreground">{event.page_url}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;