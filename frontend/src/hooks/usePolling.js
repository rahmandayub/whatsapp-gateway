import { useEffect, useRef } from 'react';
export function usePolling(callback, interval, enabled) {
    const callbackRef = useRef(callback);
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);
    useEffect(() => {
        if (!enabled)
            return;
        callbackRef.current();
        const id = setInterval(() => callbackRef.current(), interval);
        return () => clearInterval(id);
    }, [interval, enabled]);
}
