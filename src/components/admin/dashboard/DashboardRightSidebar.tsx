import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardRightSidebarProps {
    categoryBreakdown: { category: string; count: number }[];
    recentLearners: { id: string; name: string; email: string; grade: string; created_at: string }[];
}

export function DashboardRightSidebar({ categoryBreakdown, recentLearners }: DashboardRightSidebarProps) {
    return (
        <div className="space-y-6">
            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Categories</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {categoryBreakdown.map(c => (
                            <div key={c.category} className="flex items-center justify-between">
                                <span className="text-sm">{c.category}</span>
                                <Badge variant="secondary" className="text-xs">{c.count}</Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Recent Learners */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Learners</CardTitle>
                    <CardDescription>Newest registrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {recentLearners.map(l => (
                        <div key={l.id} className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {(l.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{l.name}</p>
                                <p className="text-[10px] text-muted-foreground">{l.grade} · {new Date(l.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                    {recentLearners.length === 0 && <p className="text-sm text-muted-foreground">No learners yet</p>}
                </CardContent>
            </Card>
        </div>
    );
}
