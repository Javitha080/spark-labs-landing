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
    debounceMs = 5000, // 5 seconds — fast enough for user confidence
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
    const isRecoveringRef = useRef(false);

    const storageKey = postId ? `${key}_${postId}` : key;

    // Check for recovered data on mount — only once
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
                    // Check if recovered data actually differs from current data
                    const currentStr = JSON.stringify(data);
                    const recoveredStr = JSON.stringify(parsed.data);
                    if (currentStr !== recoveredStr) {
                        setRecoveredData(parsed.data);
                        setShowRecoveryPrompt(true);
                    } else {
                        // Data matches — no need to prompt
                        localStorage.removeItem(storageKey);
                    }
                } else {
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (err) {
            console.error('[Autosave] Error checking saved data:', err);
            // Corrupted data — clean up
            try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, enabled]);

    // Save to localStorage with error handling
    const save = useCallback(() => {
        if (!enabled || isRecoveringRef.current) return;

        try {
            const saveData: AutosaveData<T> = {
                data,
                timestamp: Date.now(),
                postId,
            };
            const serialized = JSON.stringify(saveData);
            localStorage.setItem(storageKey, serialized);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
                console.warn('[Autosave] Storage quota exceeded — clearing old drafts');
                // Try to clear other draft keys
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith(key) && k !== storageKey) {
                            keysToRemove.push(k);
                        }
                    }
                    keysToRemove.forEach((k) => localStorage.removeItem(k));
                    // Retry save
                    localStorage.setItem(storageKey, JSON.stringify({ data, timestamp: Date.now(), postId }));
                    setLastSaved(new Date());
                    setHasUnsavedChanges(false);
                } catch {
                    toast.error('Unable to autosave — storage is full');
                }
            } else {
                console.error('[Autosave] Save error:', err);
            }
        }
    }, [data, storageKey, postId, enabled, key]);

    // Debounced autosave on data change
    useEffect(() => {
        if (!enabled || isRecoveringRef.current) return;

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

    // Save on tab switch / browser close
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
                save();
            }
        };

        const handlePageHide = () => {
            if (hasUnsavedChanges) {
                save();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [enabled, hasUnsavedChanges, save]);

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
            isRecoveringRef.current = true;
            onRecover(recoveredData);
            toast.success('Content recovered from autosave');
            // Allow save tracking again after a brief delay
            setTimeout(() => {
                isRecoveringRef.current = false;
                previousDataRef.current = JSON.stringify(recoveredData);
            }, 500);
        }
        setShowRecoveryPrompt(false);
        setRecoveredData(null);
    }, [recoveredData, onRecover]);

    // Decline recovery
    const declineRecovery = useCallback(() => {
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
        setShowRecoveryPrompt(false);
        setRecoveredData(null);
    }, [storageKey]);

    // Clear saved data (call after successful submit)
    const clearSavedData = useCallback(() => {
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
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
