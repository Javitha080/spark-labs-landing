import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, FolderOpen, School, Layers, Users, GraduationCap, Link2, MessageSquare, Layout } from "lucide-react";

interface QuickNavigationProps {
  onNavigate: (tab: string) => void;
}

export function QuickNavigation({ onNavigate }: QuickNavigationProps) {
  const quickLinks = [
    { tab: "courses", label: "Courses", icon: BookOpen },
    { tab: "course-manager", label: "Course Manager", icon: FolderOpen },
    { tab: "classroom", label: "Classroom", icon: School },
    { tab: "curriculum", label: "Curriculum", icon: Layers },
    { tab: "enrollments", label: "Enrollments", icon: Users },
    { tab: "workshops", label: "Workshops", icon: GraduationCap },
    { tab: "resources", label: "Resources", icon: Link2 },
    { tab: "reviews", label: "Reviews", icon: MessageSquare },
    { tab: "content", label: "Landing Content", icon: Layout },
  ];

  return (
    <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Quick Navigation</CardTitle></CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-2">
                {quickLinks.map(({ tab, label, icon: Icon }) => (
                    <Button key={tab} variant="outline" size="sm" onClick={() => onNavigate(tab)} className="gap-2">
                        <Icon className="size-4" /> {label}
                    </Button>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
