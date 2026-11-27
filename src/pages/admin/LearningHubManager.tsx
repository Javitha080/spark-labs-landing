// Manager shell only — every tab lives beside it in
// @/components/admin/learning/ (one file each; the tabs own their forms,
// dialogs, QR/code helpers and types). Keep this file parseable by keeping the
// imports mirroring the TabsList below.
import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loading } from "@/components/common/loading";
import { LayoutDashboard, FolderOpen, School, UserPlus, MessageSquare, Layout, Megaphone, Award } from "lucide-react";

const ContentTab = lazy(() => import("@/components/admin/learning/ContentTab"));
const DiscussionsTab = lazy(() => import("@/components/admin/learning/DiscussionsTab"));
const ReviewsTab = lazy(() => import("@/components/admin/learning/ReviewsTab"));
const EnrollmentsTab = lazy(() => import("@/components/admin/learning/EnrollmentsTab"));
const ResourcesTab = lazy(() => import("@/components/admin/learning/ResourcesTab"));
const WorkshopsTab = lazy(() => import("@/components/admin/learning/WorkshopsTab"));
const CourseManagerTab = lazy(() => import("@/components/admin/learning/CourseManagerTab"));
const CurriculumTab = lazy(() => import("@/components/admin/learning/CurriculumTab"));
const CoursesTab = lazy(() => import("@/components/admin/learning/CoursesTab"));
const ClassroomTab = lazy(() => import("@/components/admin/learning/ClassroomTab"));
const DashboardTab = lazy(() => import("@/components/admin/learning/DashboardTab"));
const AnnouncementsTab = lazy(() => import("@/components/admin/learning/AnnouncementsTab"));
const CertificatesTab = lazy(() => import("@/components/admin/learning/CertificatesTab"));

const LearningHubManager = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const fallback = <Loading size="md" className="py-16" />;

    return (
        <div className="space-y-6">
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

                    <TabsContent value="dashboard" className="space-y-4"><Suspense fallback={fallback}><DashboardTab onNavigate={setActiveTab} /></Suspense></TabsContent>
                    <TabsContent value="courses" className="space-y-4"><Suspense fallback={fallback}><CoursesTab onNavigate={setActiveTab} /></Suspense></TabsContent>
                    <TabsContent value="course-manager" className="space-y-4"><Suspense fallback={fallback}><CourseManagerTab /></Suspense></TabsContent>
                    <TabsContent value="classroom" className="space-y-4"><Suspense fallback={fallback}><ClassroomTab /></Suspense></TabsContent>
                    <TabsContent value="curriculum" className="space-y-4"><Suspense fallback={fallback}><CurriculumTab /></Suspense></TabsContent>
                    <TabsContent value="enrollments" className="space-y-4"><Suspense fallback={fallback}><EnrollmentsTab /></Suspense></TabsContent>
                    <TabsContent value="workshops" className="space-y-4"><Suspense fallback={fallback}><WorkshopsTab /></Suspense></TabsContent>
                    <TabsContent value="resources" className="space-y-4"><Suspense fallback={fallback}><ResourcesTab /></Suspense></TabsContent>
                    <TabsContent value="reviews" className="space-y-4"><Suspense fallback={fallback}><ReviewsTab /></Suspense></TabsContent>
                    <TabsContent value="discussions" className="space-y-4"><Suspense fallback={fallback}><DiscussionsTab /></Suspense></TabsContent>
                    <TabsContent value="announcements" className="space-y-4"><Suspense fallback={fallback}><AnnouncementsTab /></Suspense></TabsContent>
                    <TabsContent value="certificates" className="space-y-4"><Suspense fallback={fallback}><CertificatesTab /></Suspense></TabsContent>
                    <TabsContent value="content" className="space-y-4"><Suspense fallback={fallback}><ContentTab /></Suspense></TabsContent>
                </Tabs>
        </div>
    );
};

export default LearningHubManager;
