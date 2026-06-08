// react-doctor-disable no-giant-component
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Timeline, { type TimelineEntry } from "@/components/ui/Timeline";
import { useToast } from "@/hooks/use-toast";
import {
    Activity,
    Search,
    Filter,
    RefreshCw,
    User,
    Calendar,
    FileText,
    Image,
    Users,
    Settings,
    Trash2,
    Edit,
    Plus,
    Eye,
    Download,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    LayoutList,
    GitBranch,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO, subDays } from "date-fns";

interface ActivityLogEntry {
    id: string;
    user_id: string;
    user_email?: string;
    user_name?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    resource_name?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    created_at: string;
}

// Simulated activity data based on existing tables
// In production, this would come from a dedicated activity_log table
const ActivityLog = () => {
    const { toast } = useToast();
    // react-doctor-disable no-derived-state
    const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterAction, setFilterAction] = useState<string>("all");
    const [filterResource, setFilterResource] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("7days");

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) throw new Error("Not authenticated");

            const res = await fetch(`/api/activities?dateRange=${dateRange}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed with status ${res.status}`);
            }

            const data = await res.json();
            setActivities(data || []);
        } catch (error) {
            console.error("Error fetching activities:", error);
            toast({
                title: "Error",
                description: "Failed to fetch activity log",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [dateRange, toast]);

    // react-doctor-disable no-derived-state
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchActivities();
    }, [fetchActivities]);

    useRealtimeSync(["enrollment_submissions", "blog_posts", "events", "gallery_items", "team_members", "projects"], { onUpdate: fetchActivities });

    const getActionIcon = (action: string) => {
        switch (action) {
            case "create":
                return <Plus className="size-4 text-green-500" />;
            case "update":
            case "edit":
                return <Edit className="size-4 text-blue-500" />;
            case "delete":
                return <Trash2 className="size-4 text-red-500" />;
            case "publish":
                return <CheckCircle className="size-4 text-green-500" />;
            case "unpublish":
                return <XCircle className="size-4 text-orange-500" />;
            case "upload":
                return <Image className="size-4 text-purple-500" />;
            case "view":
                return <Eye className="size-4 text-gray-500" />;
            default:
                return <Activity className="size-4 text-gray-500" />;
        }
    };

    const getResourceIcon = (resourceType: string) => {
        switch (resourceType) {
            case "enrollment":
                return <Users className="size-4" />;
            case "blog_post":
                return <FileText className="size-4" />;
            case "event":
                return <Calendar className="size-4" />;
            case "gallery":
                return <Image className="size-4" />;
            case "team_member":
                return <User className="size-4" />;
            case "project":
                return <Settings className="size-4" />;
            default:
                return <FileText className="size-4" />;
        }
    };

    const getActionBadgeVariant = (action: string) => {
        switch (action) {
            case "create":
            case "publish":
                return "default";
            case "update":
            case "edit":
                return "secondary";
            case "delete":
                return "destructive";
            default:
                return "outline";
        }
    };

    const filteredActivities = activities.filter((activity) => {
        const matchesSearch =
            searchQuery === "" ||
            activity.resource_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            activity.user_email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesAction = filterAction === "all" || activity.action === filterAction;
        const matchesResource = filterResource === "all" || activity.resource_type === filterResource;

        return matchesSearch && matchesAction && matchesResource;
    });

    const exportToCSV = () => {
        const headers = ["Date", "Action", "Resource Type", "Resource Name", "User", "Details"];
        const rows = filteredActivities.map((a) => [
            format(parseISO(a.created_at), "yyyy-MM-dd HH:mm:ss"),
            a.action,
            a.resource_type,
            a.resource_name || "",
            a.user_name || a.user_email || "System",
            JSON.stringify(a.details || {}),
        ]);

        const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
            title: "Export Complete",
            description: `Exported ${filteredActivities.length} activities to CSV`,
        });
    };

    const accentForAction = (action: string) => {
        switch (action) {
            case "create":
            case "publish":
                return "from-emerald-500 to-teal-600";
            case "update":
            case "edit":
                return "from-blue-500 to-indigo-600";
            case "delete":
                return "from-rose-500 to-red-600";
            case "upload":
                return "from-fuchsia-500 to-purple-600";
            case "view":
                return "from-slate-500 to-slate-700";
            default:
                return "from-primary to-accent";
        }
    };

    const iconForAction = (action: string) => {
        switch (action) {
            case "create":
                return Plus;
            case "update":
            case "edit":
                return Edit;
            case "delete":
                return Trash2;
            case "publish":
                return CheckCircle;
            case "unpublish":
                return XCircle;
            case "upload":
                return Image;
            case "view":
                return Eye;
            default:
                return Activity;
        }
    };

    const timelineEntries: TimelineEntry[] = useMemo(
        () =>
            filteredActivities.map((a) => ({
                id: a.id,
                meta: formatDistanceToNow(parseISO(a.created_at), { addSuffix: true }),
                title: (
                    <span className="flex items-center gap-2">
                        <span className="capitalize">{a.action}</span>
                        <span className="text-muted-foreground/70 font-normal text-sm">
                            · {a.resource_type.replace("_", " ")}
                        </span>
                    </span>
                ),
                description: a.resource_name || "Unnamed resource",
                icon: iconForAction(a.action),
                accent: accentForAction(a.action),
                children: (a.user_name || a.user_email) ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                        <User className="size-3" />
                        <span>{a.user_name || a.user_email}</span>
                    </div>
                ) : undefined,
            })),
        [filteredActivities]
    );

    return (
        <div className="cms-section max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                        <span className="liquid-glass liquid-glass-subtle p-2.5 rounded-2xl">
                            <Activity className="size-6 text-primary" />
                        </span>
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Track all CMS changes and user activities
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchActivities} disabled={loading}>
                        <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="size-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="liquid-glass p-5 md:p-6">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Filter className="size-4" /> Filters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={filterAction} onValueChange={setFilterAction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="create">Create</SelectItem>
                            <SelectItem value="update">Update</SelectItem>
                            <SelectItem value="delete">Delete</SelectItem>
                            <SelectItem value="publish">Publish</SelectItem>
                            <SelectItem value="upload">Upload</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterResource} onValueChange={setFilterResource}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by resource" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Resources</SelectItem>
                            <SelectItem value="enrollment">Enrollments</SelectItem>
                            <SelectItem value="blog_post">Blog Posts</SelectItem>
                            <SelectItem value="event">Events</SelectItem>
                            <SelectItem value="gallery">Gallery</SelectItem>
                            <SelectItem value="team_member">Team Members</SelectItem>
                            <SelectItem value="project">Projects</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7days">Last 7 days</SelectItem>
                            <SelectItem value="30days">Last 30 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Activity views */}
            <div className="liquid-glass p-5 md:p-7">
                <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            Recent Activities
                            <Badge variant="secondary">{filteredActivities.length}</Badge>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredActivities.length} of {activities.length} activities
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <Skeleton className="size-11 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="text-center py-16">
                        <AlertCircle className="size-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No activities found</h3>
                        <p className="text-muted-foreground">Try adjusting your filters or date range</p>
                    </div>
                ) : (
                    <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="liquid-glass-subtle mb-5">
                            <TabsTrigger value="timeline" className="gap-2">
                                <GitBranch className="size-4" /> Timeline
                            </TabsTrigger>
                            <TabsTrigger value="list" className="gap-2">
                                <LayoutList className="size-4" /> List
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="timeline" className="mt-0">
                            <ScrollArea className="h-[640px] pr-4">
                                <div className="pl-1 pr-2 py-2">
                                    <Timeline items={timelineEntries} variant="rail" compact />
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="list" className="mt-0">
                            <ScrollArea className="h-[640px] pr-4">
                                <div className="space-y-3">
                                    {filteredActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="liquid-glass liquid-glass-subtle flex items-start gap-4 p-4"
                                        >
                                            <div className="size-10 rounded-2xl bg-muted/50 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                                                {getActionIcon(activity.action)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant={getActionBadgeVariant(activity.action)}>
                                                        {activity.action}
                                                    </Badge>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        {getResourceIcon(activity.resource_type)}
                                                        <span className="text-sm capitalize">
                                                            {activity.resource_type.replace("_", " ")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="font-medium mt-1 truncate">
                                                    {activity.resource_name || "Unnamed resource"}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                    {(activity.user_name || activity.user_email) && (
                                                        <div className="flex items-center gap-1">
                                                            <User className="size-3" />
                                                            <span>{activity.user_name || activity.user_email}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="size-3" />
                                                        <span title={format(parseISO(activity.created_at), "PPpp")}>
                                                            {formatDistanceToNow(parseISO(activity.created_at), {
                                                                addSuffix: true,
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
