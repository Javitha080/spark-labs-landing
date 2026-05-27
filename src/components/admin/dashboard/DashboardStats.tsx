import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, Star, Eye } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    courses: number;
    published: number;
    enrollments: number;
    totalLearners: number;
    avgRating: number;
    reviews: number;
    totalViews: number;
  };
  onNavigate: (tab: string) => void;
}

export function DashboardStats({ stats, onNavigate }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card onClick={() => onNavigate("courses")} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="size-5 text-primary" /></div>
                    <div><div className="text-2xl font-bold">{stats.courses}</div><p className="text-xs text-muted-foreground">Courses ({stats.published} live)</p></div>
                </div>
            </CardContent>
        </Card>
        <Card onClick={() => onNavigate("enrollments")} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="size-5 text-blue-500" /></div>
                    <div><div className="text-2xl font-bold">{stats.enrollments}</div><p className="text-xs text-muted-foreground">Enrollments</p></div>
                </div>
            </CardContent>
        </Card>
        <Card onClick={() => onNavigate("classroom")} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><GraduationCap className="size-5 text-emerald-500" /></div>
                    <div><div className="text-2xl font-bold">{stats.totalLearners}</div><p className="text-xs text-muted-foreground">Learners</p></div>
                </div>
            </CardContent>
        </Card>
        <Card onClick={() => onNavigate("reviews")} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Star className="size-5 text-amber-500" /></div>
                    <div><div className="text-2xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}</div><p className="text-xs text-muted-foreground">{stats.reviews} reviews</p></div>
                </div>
            </CardContent>
        </Card>
        <Card className="cursor-default">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Eye className="size-5 text-purple-500" /></div>
                    <div><div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total Views</p></div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
