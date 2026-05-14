import { useEffect, useRef, useCallback } from 'react';

export function usePolling(
    callback: () => Promise<void> | void,
    interval: number,
    enabled: boolean,
) {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    const tick = useCallback(() => {
        if (!enabled) return;

        let delay = interval;

        const run = async () => {
            try {
                await callbackRef.current();
                delay = interval; // Reset on success
            } catch {
                delay = Math.min(delay * 2, 30000); // Exponential backoff, cap 30s
            }
            timeoutRef.current = setTimeout(run, delay);
        };

        run();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, interval]);

    useEffect(() => {
        if (!enabled) return;
        const cleanup = tick();
        return cleanup;
    }, [enabled, tick]);
}
