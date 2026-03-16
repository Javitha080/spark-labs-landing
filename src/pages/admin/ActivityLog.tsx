import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
    const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterAction, setFilterAction] = useState<string>("all");
    const [filterResource, setFilterResource] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("7days");

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = supabase.from("activity_log").select("*") as any;

            if (dateRange !== "all") {
                const days = dateRange === "today" ? 1 : dateRange === "7days" ? 7 : 30;
                const dateLimit = subDays(new Date(), days).toISOString();
                query = query.gte("created_at", dateLimit);
            }

            const { data, error } = await query.order("created_at", { ascending: false });

            if (error) throw error;

            setActivities((data || []) as unknown as ActivityLogEntry[]);
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

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    useRealtimeSync(["activity_log"], { onUpdate: fetchActivities });

    const getActionIcon = (action: string) => {
        switch (action) {
            case "create":
                return <Plus className="w-4 h-4 text-green-500" />;
            case "update":
            case "edit":
                return <Edit className="w-4 h-4 text-blue-500" />;
            case "delete":
                return <Trash2 className="w-4 h-4 text-red-500" />;
            case "publish":
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "unpublish":
                return <XCircle className="w-4 h-4 text-orange-500" />;
            case "upload":
                return <Image className="w-4 h-4 text-purple-500" />;
            case "view":
                return <Eye className="w-4 h-4 text-gray-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getResourceIcon = (resourceType: string) => {
        switch (resourceType) {
            case "enrollment":
                return <Users className="w-4 h-4" />;
            case "blog_post":
                return <FileText className="w-4 h-4" />;
            case "event":
                return <Calendar className="w-4 h-4" />;
            case "gallery":
                return <Image className="w-4 h-4" />;
            case "team_member":
                return <User className="w-4 h-4" />;
            case "project":
                return <Settings className="w-4 h-4" />;
            default:
                return <FileText className="w-4 h-4" />;
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Activity className="w-7 h-7 text-primary" />
                        Activity Log
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Track all CMS changes and user activities
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchActivities} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                </CardContent>
            </Card>

            {/* Activity List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        Recent Activities
                        <Badge variant="secondary" className="ml-2">
                            {filteredActivities.length}
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Showing {filteredActivities.length} of {activities.length} activities
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">No activities found</h3>
                            <p className="text-muted-foreground">
                                Try adjusting your filters or date range
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[600px] pr-4">
                            <div className="space-y-4">
                                {filteredActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                    >
                                        {/* Action Icon */}
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                                            {getActionIcon(activity.action)}
                                        </div>

                                        {/* Content */}
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
                                                        <User className="w-3 h-3" />
                                                        <span>{activity.user_name || activity.user_email}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ActivityLog;
