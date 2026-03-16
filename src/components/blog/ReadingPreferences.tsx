import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings2, Type, AlignLeft, Palette, Maximize2,
    Sun, Moon, BookOpen, Minus, Plus, X, Sparkles,
    Eye, EyeOff, Volume2, VolumeX, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

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

    // Check if system/site is currently dark
    const [isGlobalDark, setIsGlobalDark] = useState(false);
    useEffect(() => {
        const checkDark = () => {
            setIsGlobalDark(document.documentElement.classList.contains('dark'));
        };
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return {
        preferences,
        updatePreference,
        resetPreferences,
        getContentClasses,
        getThemeClass,
        isGlobalDark
    };
};

interface ReadingPreferencesPanelProps {
    preferences: ReadingPreferencesState;
    updatePreference: <K extends keyof ReadingPreferencesState>(
        key: K,
        value: ReadingPreferencesState[K]
    ) => void;
    resetPreferences: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
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

interface PreferenceContentProps {
    preferences: ReadingPreferencesState;
    updatePreference: <K extends keyof ReadingPreferencesState>(
        key: K,
        value: ReadingPreferencesState[K]
    ) => void;
    resetPreferences: () => void;
    isGlobalDark?: boolean;
}

const PreferenceContent = ({ preferences, updatePreference, resetPreferences, isGlobalDark }: PreferenceContentProps) => (
    <>
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

        <ScrollArea className="flex-1 max-h-[70vh]">
            <div className="p-4 space-y-6">
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
                            icon={isGlobalDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                            label="Default"
                            current={preferences.theme}
                            onClick={() => updatePreference('theme', 'default')}
                        />
                        <ThemeOption
                            value="sepia"
                            icon={<div className="h-5 w-5 rounded-full bg-[#f4ecd8] border border-black/5" />}
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
                            icon={<div className="h-5 w-5 rounded-full bg-[#fdfdfd] border border-black/10" />}
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
                <div className="space-y-4">
                    {/* Focus Mode */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {preferences.focusMode ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                            <div>
                                <Label className="text-sm font-medium">Focus Mode</Label>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Dim distractions</p>
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
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">OpenDyslexic font</p>
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
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Less animations</p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.reducedMotion}
                            onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
                        />
                    </div>
                </div>
            </div>
        </ScrollArea>
    </>
);

export const ReadingPreferencesPanel = ({
    preferences,
    updatePreference,
    resetPreferences,
    open,
    onOpenChange,
    isGlobalDark
}: ReadingPreferencesPanelProps & { isGlobalDark?: boolean }) => {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild className="hidden lg:inline-flex">
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 rounded-full border-border/50 bg-background/80 backdrop-blur-md shadow-lg",
                        "hover:bg-primary/10 hover:border-primary/50 transition-all duration-300",
                        isOpen && "bg-primary/10 border-primary/50"
                    )}
                >
                    <Settings2 className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                side="bottom"
                sideOffset={28}
                collisionPadding={110}
                className="w-80 p-0 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl z-[100]"
            >
                <PreferenceContent
                    preferences={preferences}
                    updatePreference={updatePreference}
                    resetPreferences={resetPreferences}
                    isGlobalDark={isGlobalDark}
                />
            </PopoverContent>
        </Popover>
    );
};

// Floating Reading Preferences Button for Mobile
export const FloatingReadingButton = (props: ReadingPreferencesPanelProps & { isGlobalDark?: boolean }) => {
    return (
        <div className="fixed bottom-6 left-6 z-[60] lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <Sheet open={props.open} onOpenChange={props.onOpenChange}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => props.onOpenChange?.(true)}
                        className={cn(
                            "h-14 w-14 rounded-full border-border/50 bg-background/80 backdrop-blur-md shadow-xl",
                            "hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                        )}
                    >
                        <Settings2 className="h-6 w-6" />
                    </Button>
                </motion.div>
                <SheetContent side="bottom" className="rounded-t-[2.5rem] p-0 h-fit max-h-[85vh] overflow-hidden border-t border-white/10 shadow-2xl">
                    <VisuallyHidden.Root>
                        <SheetTitle>Reading Preferences</SheetTitle>
                    </VisuallyHidden.Root>
                    {/* Drag handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>
                    <div className="pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
                        <PreferenceContent
                            preferences={props.preferences}
                            updatePreference={props.updatePreference}
                            resetPreferences={props.resetPreferences}
                            isGlobalDark={props.isGlobalDark}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

// Header Reading Preferences for PC/Tablet — renders as a popover button next to the Share button
export const HeaderReadingPreferences = ({
    preferences,
    updatePreference,
    resetPreferences,
    isGlobalDark,
}: PreferenceContentProps) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-border/50 bg-background/50 backdrop-blur-md hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    title="Reading Settings"
                >
                    <Settings2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="center"
                side="left"
                sideOffset={16}
                className="w-80 p-0 rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl z-[100]"
            >
                <PreferenceContent
                    preferences={preferences}
                    updatePreference={updatePreference}
                    resetPreferences={resetPreferences}
                    isGlobalDark={isGlobalDark}
                />
            </PopoverContent>
        </Popover>
    );
};

export default ReadingPreferencesPanel;

