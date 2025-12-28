import { useEffect, useRef } from 'react';
import { wsService } from '../services/websocket';

export function useWebSocket() {
    const isConnected = useRef(false);

    useEffect(() => {
        if (!isConnected.current) {
            wsService.connect();
            isConnected.current = true;
        }

        return () => {
            wsService.disconnect();
            isConnected.current = false;
        };
    }, []);

    return wsService;
}

export function useWebSocketEvent(event: string, callback: Function) {
    useEffect(() => {
        wsService.on(event, callback);

        return () => {
            wsService.off(event, callback);
        };
    }, [event, callback]);
}
