import { useEffect, useCallback, useState, useRef } from 'react';
import { toast } from 'sonner';

interface AutosaveData<T> {
    data: T;
    timestamp: number;
    postId?: string;
}

interface UseAutosaveOptions<T> {
    key: string;
    data: T;
    postId?: string;
    debounceMs?: number;
    onRecover?: (data: T) => void;
    enabled?: boolean;
}

export function useAutosave<T>({
    key,
    data,
    postId,
    debounceMs = 30000, // 30 seconds default
    onRecover,
    enabled = true,
}: UseAutosaveOptions<T>) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [recoveredData, setRecoveredData] = useState<T | null>(null);
    const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousDataRef = useRef<string>('');
    const initialCheckDone = useRef(false);

    const storageKey = postId ? `${key}_${postId}` : key;

    // Check for recovered data on mount
    useEffect(() => {
        if (!enabled || initialCheckDone.current) return;
        initialCheckDone.current = true;

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed: AutosaveData<T> = JSON.parse(stored);
                const ageMinutes = (Date.now() - parsed.timestamp) / 1000 / 60;

                // Only offer recovery if data is less than 24 hours old
                if (ageMinutes < 1440) {
                    setRecoveredData(parsed.data);
                    setShowRecoveryPrompt(true);
                } else {
                    // Clear old data
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (err) {
            console.error('Error checking autosave data:', err);
        }
    }, [storageKey, enabled]);

    // Save to localStorage
    const save = useCallback(() => {
        if (!enabled) return;

        try {
            const saveData: AutosaveData<T> = {
                data,
                timestamp: Date.now(),
                postId,
            };
            localStorage.setItem(storageKey, JSON.stringify(saveData));
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Autosave error:', err);
        }
    }, [data, storageKey, postId, enabled]);

    // Debounced autosave
    useEffect(() => {
        if (!enabled) return;

        const currentDataStr = JSON.stringify(data);

        // Skip if data hasn't changed
        if (currentDataStr === previousDataRef.current) return;
        previousDataRef.current = currentDataStr;

        setHasUnsavedChanges(true);

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout for debounced save
        timeoutRef.current = setTimeout(() => {
            save();
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, save, debounceMs, enabled]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        if (!enabled || !hasUnsavedChanges) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, enabled]);

    // Accept recovered data
    const acceptRecovery = useCallback(() => {
        if (recoveredData && onRecover) {
            onRecover(recoveredData);
            toast.success('Content recovered from autosave');
        }
        setShowRecoveryPrompt(false);
        setRecoveredData(null);
    }, [recoveredData, onRecover]);

    // Decline recovery
    const declineRecovery = useCallback(() => {
        localStorage.removeItem(storageKey);
        setShowRecoveryPrompt(false);
        setRecoveredData(null);
    }, [storageKey]);

    // Clear saved data (call after successful submit)
    const clearSavedData = useCallback(() => {
        localStorage.removeItem(storageKey);
        setLastSaved(null);
        setHasUnsavedChanges(false);
    }, [storageKey]);

    // Force save now
    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        save();
        toast.success('Draft saved');
    }, [save]);

    return {
        lastSaved,
        hasUnsavedChanges,
        showRecoveryPrompt,
        recoveredData,
        acceptRecovery,
        declineRecovery,
        clearSavedData,
        saveNow,
    };
}

export default useAutosave;
