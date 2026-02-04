import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
    Upload,
    Download,
    FileSpreadsheet,
    FileJson,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    Table,
    RefreshCw,
    Trash2,
    ArrowRight,
    Eye,
    HelpCircle,
} from "lucide-react";

interface ImportPreviewRow {
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
    isValid: boolean;
}

interface ExportConfig {
    table: string;
    fields: string[];
    format: "csv" | "json";
}

const IMPORTABLE_TABLES = [
    { value: "team_members", label: "Team Members", requiredFields: ["name", "role"], optionalFields: ["email", "description", "linkedin_url"] },
    { value: "events", label: "Events", requiredFields: ["title", "event_date"], optionalFields: ["description", "location", "category", "event_time"] },
    { value: "projects", label: "Projects", requiredFields: ["title"], optionalFields: ["description", "category", "image_url"] },
] as const;

const EXPORTABLE_TABLES = [
    { value: "team_members", label: "Team Members" },
    { value: "events", label: "Events" },
    { value: "projects", label: "Projects" },
    { value: "enrollment_submissions", label: "Enrollments" },
    { value: "blog_posts", label: "Blog Posts" },
    { value: "gallery_items", label: "Gallery Items" },
] as const;

const BulkImportExport = () => {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("import");

    // Import state
    const [importTable, setImportTable] = useState<string>("");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

    // Export state
    const [exportTable, setExportTable] = useState<string>("");
    const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
    const [isExporting, setIsExporting] = useState(false);

    const selectedTableConfig = IMPORTABLE_TABLES.find((t) => t.value === importTable);

    const parseCSV = (content: string): Record<string, string>[] => {
        const lines = content.trim().split("\n");
        if (lines.length < 2) return [];

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || "";
            });
            rows.push(row);
        }

        return rows;
    };

    const validateRow = (row: Record<string, string>, config: typeof IMPORTABLE_TABLES[number]): string[] => {
        const errors: string[] = [];

        config.requiredFields.forEach((field) => {
            if (!row[field] || row[field].trim() === "") {
                errors.push(`Missing required field: ${field}`);
            }
        });

        // Table-specific validation
        if (config.value === "events" && row.event_date) {
            const date = new Date(row.event_date);
            if (isNaN(date.getTime())) {
                errors.push("Invalid date format for event_date");
            }
        }

        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push("Invalid email format");
        }

        return errors;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        setImportResult(null);

        const content = await file.text();
        const rows = parseCSV(content);

        if (!selectedTableConfig) {
            toast({
                title: "Select a table first",
                description: "Please select a table before uploading a file",
                variant: "destructive",
            });
            return;
        }

        const previewRows: ImportPreviewRow[] = rows.map((row, index) => {
            const errors = validateRow(row, selectedTableConfig);
            return {
                rowNumber: index + 2, // +2 for 1-based index and header row
                data: row,
                errors,
                isValid: errors.length === 0,
            };
        });

        setImportPreview(previewRows);
    };

    const handleImport = async () => {
        if (!importTable || importPreview.length === 0) return;

        setIsImporting(true);
        setImportProgress(0);
        setImportResult(null);

        let successCount = 0;
        let failedCount = 0;

        const validRows = importPreview.filter((row) => row.isValid);

        for (let i = 0; i < validRows.length; i++) {
            try {
                const row = validRows[i];
                const insertData: Record<string, unknown> = {};

                // Map CSV fields to database fields
                Object.entries(row.data).forEach(([key, value]) => {
                    if (value && value.trim() !== "") {
                        insertData[key] = value;
                    }
                });

                const { error } = await supabase.from(importTable as "team_members" | "events" | "projects").insert(insertData as never);

                if (error) {
                    console.error(`Row ${row.rowNumber} error:`, error);
                    failedCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                failedCount++;
            }

            setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
        }

        setImportResult({ success: successCount, failed: failedCount });
        setIsImporting(false);

        toast({
            title: "Import Complete",
            description: `Successfully imported ${successCount} records. ${failedCount} failed.`,
            variant: failedCount === 0 ? "default" : "destructive",
        });
    };

    const handleExport = async () => {
        if (!exportTable) return;

        setIsExporting(true);

        try {
            const { data, error } = await supabase
                .from(exportTable as "team_members")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                toast({
                    title: "No data",
                    description: "No records found to export",
                    variant: "destructive",
                });
                setIsExporting(false);
                return;
            }

            let content: string;
            let mimeType: string;
            let extension: string;

            if (exportFormat === "json") {
                content = JSON.stringify(data, null, 2);
                mimeType = "application/json";
                extension = "json";
            } else {
                const headers = Object.keys(data[0]);
                const rows = data.map((row) =>
                    headers.map((h) => {
                        const value = (row as Record<string, unknown>)[h];
                        const strValue = value === null ? "" : String(value);
                        return strValue.includes(",") ? `"${strValue}"` : strValue;
                    }).join(",")
                );
                content = [headers.join(","), ...rows].join("\n");
                mimeType = "text/csv";
                extension = "csv";
            }

            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${exportTable}-export-${new Date().toISOString().split("T")[0]}.${extension}`;
            a.click();
            URL.revokeObjectURL(url);

            toast({
                title: "Export Complete",
                description: `Exported ${data.length} records to ${extension.toUpperCase()}`,
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Export Failed",
                description: "An error occurred while exporting data",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const downloadTemplate = () => {
        if (!selectedTableConfig) return;

        const allFields = [...selectedTableConfig.requiredFields, ...selectedTableConfig.optionalFields];
        const content = allFields.join(",");
        const blob = new Blob([content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${importTable}-template.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
            title: "Template Downloaded",
            description: "Fill in the template and upload it to import data",
        });
    };

    const clearImport = () => {
        setImportFile(null);
        setImportPreview([]);
        setImportProgress(0);
        setImportResult(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-7 h-7 text-primary" />
                    Bulk Import / Export
                </h1>
                <p className="text-muted-foreground mt-1">
                    Import data from CSV or export existing data
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="import" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import
                    </TabsTrigger>
                    <TabsTrigger value="export" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export
                    </TabsTrigger>
                </TabsList>

                {/* Import Tab */}
                <TabsContent value="import" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Configuration */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Table className="w-5 h-5" />
                                    Import Configuration
                                </CardTitle>
                                <CardDescription>
                                    Select a table and upload a CSV file
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Target Table</Label>
                                    <Select value={importTable} onValueChange={(v) => { setImportTable(v); clearImport(); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a table to import into" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {IMPORTABLE_TABLES.map((table) => (
                                                <SelectItem key={table.value} value={table.value}>
                                                    {table.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedTableConfig && (
                                    <Alert>
                                        <HelpCircle className="w-4 h-4" />
                                        <AlertDescription>
                                            <p className="font-medium mb-1">Required fields:</p>
                                            <p className="text-sm">{selectedTableConfig.requiredFields.join(", ")}</p>
                                            <p className="font-medium mt-2 mb-1">Optional fields:</p>
                                            <p className="text-sm">{selectedTableConfig.optionalFields.join(", ")}</p>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {importTable && (
                                    <Button variant="outline" onClick={downloadTemplate} className="w-full">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Template
                                    </Button>
                                )}

                                <div className="space-y-2">
                                    <Label>CSV File</Label>
                                    <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        disabled={!importTable}
                                    />
                                </div>

                                {importFile && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                                            <span className="text-sm font-medium">{importFile.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={clearImport}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                {isImporting && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Importing...</span>
                                            <span>{importProgress}%</span>
                                        </div>
                                        <Progress value={importProgress} />
                                    </div>
                                )}

                                {importResult && (
                                    <Alert variant={importResult.failed === 0 ? "default" : "destructive"}>
                                        <CheckCircle className="w-4 h-4" />
                                        <AlertDescription>
                                            Imported {importResult.success} records successfully.
                                            {importResult.failed > 0 && ` ${importResult.failed} failed.`}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={handleImport}
                                    disabled={!importPreview.some((r) => r.isValid) || isImporting}
                                    className="w-full"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Import {importPreview.filter((r) => r.isValid).length} Records
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Preview */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Import Preview
                                </CardTitle>
                                <CardDescription>
                                    {importPreview.length > 0
                                        ? `${importPreview.filter((r) => r.isValid).length} valid, ${importPreview.filter((r) => !r.isValid).length} with errors`
                                        : "Upload a file to preview"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {importPreview.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No data to preview</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-2">
                                            {importPreview.map((row) => (
                                                <div
                                                    key={row.rowNumber}
                                                    className={`p-3 rounded-lg border ${row.isValid
                                                            ? "bg-green-500/5 border-green-500/20"
                                                            : "bg-red-500/5 border-red-500/20"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">Row {row.rowNumber}</span>
                                                        {row.isValid ? (
                                                            <Badge variant="outline" className="text-green-500 border-green-500">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Valid
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-red-500 border-red-500">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Has Errors
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {Object.entries(row.data)
                                                            .filter(([_, v]) => v)
                                                            .map(([k, v]) => (
                                                                <span key={k} className="mr-3">
                                                                    <strong>{k}:</strong> {v}
                                                                </span>
                                                            ))}
                                                    </div>
                                                    {row.errors.length > 0 && (
                                                        <div className="mt-2 text-sm text-red-500">
                                                            {row.errors.map((error, i) => (
                                                                <div key={i} className="flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    {error}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Export Tab */}
                <TabsContent value="export" className="space-y-6">
                    <Card className="max-w-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Export Data
                            </CardTitle>
                            <CardDescription>
                                Export data from any table to CSV or JSON format
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Table to Export</Label>
                                <Select value={exportTable} onValueChange={setExportTable}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a table" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EXPORTABLE_TABLES.map((table) => (
                                            <SelectItem key={table.value} value={table.value}>
                                                {table.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Export Format</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant={exportFormat === "csv" ? "default" : "outline"}
                                        onClick={() => setExportFormat("csv")}
                                        className="flex-1"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        CSV
                                    </Button>
                                    <Button
                                        variant={exportFormat === "json" ? "default" : "outline"}
                                        onClick={() => setExportFormat("json")}
                                        className="flex-1"
                                    >
                                        <FileJson className="w-4 h-4 mr-2" />
                                        JSON
                                    </Button>
                                </div>
                            </div>

                            <Button
                                onClick={handleExport}
                                disabled={!exportTable || isExporting}
                                className="w-full"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Export to {exportFormat.toUpperCase()}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default BulkImportExport;
