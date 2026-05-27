import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Course {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  level: string | null;
  enrolled_count: number | null;
  view_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  is_published: boolean | null;
}

interface CoursePerformanceTableProps {
  topCourses: Course[];
  onNavigate: (tab: string) => void;
}

export function CoursePerformanceTable({ topCourses, onNavigate }: CoursePerformanceTableProps) {
  return (
    <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
            <CardTitle className="text-base">Course Performance</CardTitle>
            <CardDescription>Top courses by enrollment</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead className="text-center w-20">Students</TableHead>
                        <TableHead className="text-center w-20">Views</TableHead>
                        <TableHead className="text-center w-20">Rating</TableHead>
                        <TableHead className="text-center w-16">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topCourses.map(c => (
                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onNavigate("course-manager")}>
                            <TableCell>
                                <div className="font-medium text-sm line-clamp-1">{c.title}</div>
                                <div className="text-xs text-muted-foreground">{c.category} · {c.level}</div>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">{c.enrolled_count || 0}</TableCell>
                            <TableCell className="text-center text-sm">{(c.view_count || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                                {(c.rating_avg || 0) > 0 ? (
                                    <span className="text-sm font-medium text-amber-500">{(c.rating_avg || 0).toFixed(1)}</span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center">
                                {c.is_published ? <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">Live</Badge> : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                            </TableCell>
                        </TableRow>
                    ))}
                    {topCourses.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No courses yet</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
