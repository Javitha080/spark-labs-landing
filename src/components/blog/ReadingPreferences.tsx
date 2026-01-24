import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings2, Type, AlignLeft, Palette, Maximize2,
    Sun, Moon, BookOpen, Minus, Plus, X, Sparkles,
    Eye, EyeOff, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export interface ReadingPreferencesState {
    fontSize: 'sm' | 'md' | 'lg' | 'xl';
    lineSpacing: 'compact' | 'normal' | 'relaxed';
    theme: 'default' | 'sepia' | 'amoled' | 'paper';
    contentWidth: 'narrow' | 'normal' | 'wide';
    focusMode: boolean;
    dyslexicFont: boolean;
    reducedMotion: boolean;
}

const STORAGE_KEY = 'blog_reading_preferences';

const defaultPreferences: ReadingPreferencesState = {
    fontSize: 'md',
    lineSpacing: 'normal',
    theme: 'default',
    contentWidth: 'normal',
    focusMode: false,
    dyslexicFont: false,
    reducedMotion: false,
};

export const useReadingPreferences = () => {
    const [preferences, setPreferences] = useState<ReadingPreferencesState>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    return { ...defaultPreferences, ...JSON.parse(saved) };
                } catch {
                    return defaultPreferences;
                }
            }
        }
        return defaultPreferences;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    }, [preferences]);

    const updatePreference = useCallback(<K extends keyof ReadingPreferencesState>(
        key: K,
        value: ReadingPreferencesState[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetPreferences = useCallback(() => {
        setPreferences(defaultPreferences);
    }, []);

    // Generate CSS classes based on preferences
    const getContentClasses = useCallback(() => {
        const classes: string[] = ['blog-content-enhanced'];

        // Font size
        classes.push(`reading-text-${preferences.fontSize}`);

        // Line spacing
        classes.push(`reading-spacing-${preferences.lineSpacing}`);

        // Content width
        classes.push(`reading-width-${preferences.contentWidth}`);

        // Theme
        if (preferences.theme !== 'default') {
            classes.push(`reading-theme-${preferences.theme}`);
        }

        // Focus mode
        if (preferences.focusMode) {
            classes.push('reading-focus-mode');
        }

        // Dyslexic font
        if (preferences.dyslexicFont) {
            classes.push('reading-dyslexic');
        }

        // Reduced motion
        if (preferences.reducedMotion) {
            classes.push('reading-reduced-motion');
        }

        return classes.join(' ');
    }, [preferences]);

    // Get only the theme class for the global wrapper
    const getThemeClass = useCallback(() => {
        if (preferences.theme !== 'default') {
            return `reading-theme-${preferences.theme}`;
        }
        return '';
    }, [preferences.theme]);

    return {
        preferences,
        updatePreference,
        resetPreferences,
        getContentClasses,
        getThemeClass,
    };
};

interface ReadingPreferencesPanelProps {
    preferences: ReadingPreferencesState;
    updatePreference: <K extends keyof ReadingPreferencesState>(
        key: K,
        value: ReadingPreferencesState[K]
    ) => void;
    resetPreferences: () => void;
}

const FontSizeOption = ({
    value,
    label,
    current,
    onClick
}: {
    value: string;
    label: string;
    current: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
            current === value
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
    >
        {label}
    </button>
);

const ThemeOption = ({
    value,
    icon,
    label,
    current,
    onClick,
    className,
}: {
    value: string;
    icon: React.ReactNode;
    label: string;
    current: string;
    onClick: () => void;
    className?: string;
}) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 border-2",
            current === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground",
            className
        )}
        title={label}
    >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

export const ReadingPreferencesPanel = ({
    preferences,
    updatePreference,
    resetPreferences,
}: ReadingPreferencesPanelProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-10 w-10 rounded-full border-border/50 bg-background/80 backdrop-blur-md shadow-lg",
                        "hover:bg-primary/10 hover:border-primary/50 transition-all duration-300",
                        isOpen && "bg-primary/10 border-primary/50"
                    )}
                >
                    <Settings2 className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 p-0 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Reading Preferences</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetPreferences}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Reset
                    </Button>
                </div>

                <div className="p-4 space-y-5">
                    {/* Font Size */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Type className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Text Size
                            </Label>
                        </div>
                        <div className="flex gap-2">
                            <FontSizeOption value="sm" label="S" current={preferences.fontSize} onClick={() => updatePreference('fontSize', 'sm')} />
                            <FontSizeOption value="md" label="M" current={preferences.fontSize} onClick={() => updatePreference('fontSize', 'md')} />
                            <FontSizeOption value="lg" label="L" current={preferences.fontSize} onClick={() => updatePreference('fontSize', 'lg')} />
                            <FontSizeOption value="xl" label="XL" current={preferences.fontSize} onClick={() => updatePreference('fontSize', 'xl')} />
                        </div>
                    </div>

                    {/* Line Spacing */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <AlignLeft className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Line Spacing
                            </Label>
                        </div>
                        <div className="flex gap-2">
                            <FontSizeOption value="compact" label="Compact" current={preferences.lineSpacing} onClick={() => updatePreference('lineSpacing', 'compact')} />
                            <FontSizeOption value="normal" label="Normal" current={preferences.lineSpacing} onClick={() => updatePreference('lineSpacing', 'normal')} />
                            <FontSizeOption value="relaxed" label="Relaxed" current={preferences.lineSpacing} onClick={() => updatePreference('lineSpacing', 'relaxed')} />
                        </div>
                    </div>

                    {/* Reading Theme */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Reading Theme
                            </Label>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            <ThemeOption
                                value="default"
                                icon={<Moon className="h-5 w-5" />}
                                label="Default"
                                current={preferences.theme}
                                onClick={() => updatePreference('theme', 'default')}
                            />
                            <ThemeOption
                                value="sepia"
                                icon={<div className="h-5 w-5 rounded-full bg-amber-200/80" />}
                                label="Sepia"
                                current={preferences.theme}
                                onClick={() => updatePreference('theme', 'sepia')}
                            />
                            <ThemeOption
                                value="amoled"
                                icon={<div className="h-5 w-5 rounded-full bg-black border border-white/20" />}
                                label="AMOLED"
                                current={preferences.theme}
                                onClick={() => updatePreference('theme', 'amoled')}
                            />
                            <ThemeOption
                                value="paper"
                                icon={<Sun className="h-5 w-5" />}
                                label="Paper"
                                current={preferences.theme}
                                onClick={() => updatePreference('theme', 'paper')}
                            />
                        </div>
                    </div>

                    {/* Content Width */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Maximize2 className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Content Width
                            </Label>
                        </div>
                        <div className="flex gap-2">
                            <FontSizeOption value="narrow" label="Narrow" current={preferences.contentWidth} onClick={() => updatePreference('contentWidth', 'narrow')} />
                            <FontSizeOption value="normal" label="Normal" current={preferences.contentWidth} onClick={() => updatePreference('contentWidth', 'normal')} />
                            <FontSizeOption value="wide" label="Wide" current={preferences.contentWidth} onClick={() => updatePreference('contentWidth', 'wide')} />
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Additional Options */}
                    <div className="space-y-3">
                        {/* Focus Mode */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {preferences.focusMode ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                <div>
                                    <Label className="text-sm font-medium">Focus Mode</Label>
                                    <p className="text-[10px] text-muted-foreground">Dim distractions</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.focusMode}
                                onCheckedChange={(checked) => updatePreference('focusMode', checked)}
                            />
                        </div>

                        {/* Dyslexic-friendly Font */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">Dyslexia-friendly</Label>
                                    <p className="text-[10px] text-muted-foreground">OpenDyslexic font</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.dyslexicFont}
                                onCheckedChange={(checked) => updatePreference('dyslexicFont', checked)}
                            />
                        </div>

                        {/* Reduced Motion */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <VolumeX className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <Label className="text-sm font-medium">Reduce Motion</Label>
                                    <p className="text-[10px] text-muted-foreground">Less animations</p>
                                </div>
                            </div>
                            <Switch
                                checked={preferences.reducedMotion}
                                onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// Floating Reading Preferences Button for Mobile
export const FloatingReadingButton = (props: ReadingPreferencesPanelProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-24 right-6 z-30 lg:hidden"
        >
            <ReadingPreferencesPanel {...props} />
        </motion.div>
    );
};

export default ReadingPreferencesPanel;
