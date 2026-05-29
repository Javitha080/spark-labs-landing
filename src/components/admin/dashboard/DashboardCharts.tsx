import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";
// react-doctor-disable prefer-dynamic-import
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardChartsProps {
  enrollmentTrends: { date: string; count: number }[];
  completionRates: { title: string; rate: number; total: number }[];
}

export function DashboardCharts({ enrollmentTrends, completionRates }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="size-5 text-primary" /> Enrollment Trends</CardTitle>
                <CardDescription>Weekly enrollments over the last 12 weeks</CardDescription>
            </CardHeader>
            <CardContent>
                {enrollmentTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={enrollmentTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} name="Enrollments" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">No enrollment data yet</div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Course Completion Rates</CardTitle>
                <CardDescription>Percentage of enrolled learners who completed each course</CardDescription>
            </CardHeader>
            <CardContent>
                {completionRates.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={completionRates} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" />
                            <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(value: number) => `${value}%`} />
                            <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Completion %" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">No completion data yet</div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
