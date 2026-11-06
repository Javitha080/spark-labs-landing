// Manager shell only — every tab lives beside it in
// @/components/admin/learning/ (one file each; the tabs own their forms,
// dialogs, QR/code helpers and types). Keep this file parseable by keeping the
// imports mirroring the TabsList below.
import ContentTab from "@/components/admin/learning/ContentTab";
import DiscussionsTab from "@/components/admin/learning/DiscussionsTab";
import ReviewsTab from "@/components/admin/learning/ReviewsTab";
import EnrollmentsTab from "@/components/admin/learning/EnrollmentsTab";
import ResourcesTab from "@/components/admin/learning/ResourcesTab";
import WorkshopsTab from "@/components/admin/learning/WorkshopsTab";
import CourseManagerTab from "@/components/admin/learning/CourseManagerTab";
import CurriculumTab from "@/components/admin/learning/CurriculumTab";
import CoursesTab from "@/components/admin/learning/CoursesTab";
import ClassroomTab from "@/components/admin/learning/ClassroomTab";
import DashboardTab from "@/components/admin/learning/DashboardTab";
import AnnouncementsTab from "@/components/admin/learning/AnnouncementsTab";
import CertificatesTab from "@/components/admin/learning/CertificatesTab";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, FolderOpen, School, UserPlus, MessageSquare, Layout, Megaphone, Award } from "lucide-react";

const LearningHubManager = () => {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="min-h-screen bg-background border-l">
            <div className="h-full px-4 py-6 lg:px-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Learning Hub Manager</h2>
                            <p className="text-muted-foreground">Manage courses, classroom, curriculum, enrollments, and content.</p>
                        </div>
                    </div>
                    <Separator />
                    <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
                        <TabsTrigger value="dashboard" className="gap-1.5"><LayoutDashboard className="size-4" /> Dashboard</TabsTrigger>
                        <TabsTrigger value="courses">Courses</TabsTrigger>
                        <TabsTrigger value="course-manager" className="gap-1.5"><FolderOpen className="size-4" /> Course Manager</TabsTrigger>
                        <TabsTrigger value="classroom" className="gap-1.5"><School className="size-4" /> Classroom</TabsTrigger>
                        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                        <TabsTrigger value="enrollments" className="gap-1.5"><UserPlus className="size-4" /> Enrollments</TabsTrigger>
                        <TabsTrigger value="workshops">Workshops</TabsTrigger>
                        <TabsTrigger value="resources">Resources</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                        <TabsTrigger value="discussions" className="gap-1.5"><MessageSquare className="size-4" /> Q&A</TabsTrigger>
                        <TabsTrigger value="announcements" className="gap-1.5"><Megaphone className="size-4" /> Announcements</TabsTrigger>
                        <TabsTrigger value="certificates" className="gap-1.5"><Award className="size-4" /> Certificates</TabsTrigger>
                        <TabsTrigger value="content" className="gap-2"><Layout className="size-4" /> Content</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard" className="space-y-4"><DashboardTab onNavigate={setActiveTab} /></TabsContent>
                    <TabsContent value="courses" className="space-y-4"><CoursesTab onNavigate={setActiveTab} /></TabsContent>
                    <TabsContent value="course-manager" className="space-y-4"><CourseManagerTab /></TabsContent>
                    <TabsContent value="classroom" className="space-y-4"><ClassroomTab /></TabsContent>
                    <TabsContent value="curriculum" className="space-y-4"><CurriculumTab /></TabsContent>
                    <TabsContent value="enrollments" className="space-y-4"><EnrollmentsTab /></TabsContent>
                    <TabsContent value="workshops" className="space-y-4"><WorkshopsTab /></TabsContent>
                    <TabsContent value="resources" className="space-y-4"><ResourcesTab /></TabsContent>
                    <TabsContent value="reviews" className="space-y-4"><ReviewsTab /></TabsContent>
                    <TabsContent value="discussions" className="space-y-4"><DiscussionsTab /></TabsContent>
                    <TabsContent value="announcements" className="space-y-4"><AnnouncementsTab /></TabsContent>
                    <TabsContent value="certificates" className="space-y-4"><CertificatesTab /></TabsContent>
                    <TabsContent value="content" className="space-y-4"><ContentTab /></TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default LearningHubManager;
