import { useEffect, useRef } from "react";
import { buildMessageSocketUrl } from "../services/messageService.js";

const RECONNECT_DELAY_MS = 3000;

/**
 * Keeps a WebSocket open to the message channel and forwards every server event
 * to the latest handler. Connections are re-established after an unexpected close.
 *
 * @param {(event: {type: string, message: Object}) => void} onEvent - Handler for each event.
 * @example
 * useMessageSocket((event) => {
 *     if (event.type === "message.created") {
 *         refreshInbox();
 *     }
 * });
 */
export function useMessageSocket(onEvent) {
    const handlerRef = useRef(onEvent);

    useEffect(() => {
        handlerRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        let isActive = true;
        let socket = null;
        let retryTimer = null;

        const forwardEvent = (rawEvent) => {
            try {
                handlerRef.current(JSON.parse(rawEvent.data));
            } catch (error) {
                console.error("useMessageSocket.forwardEvent", error);
            }
        };

        const open = () => {
            socket = new WebSocket(buildMessageSocketUrl());
            socket.onmessage = forwardEvent;
            socket.onclose = () => {
                if (isActive) {
                    retryTimer = setTimeout(open, RECONNECT_DELAY_MS);
                }
            };
        };

        open();
        return () => {
            isActive = false;
            clearTimeout(retryTimer);
            socket?.close();
        };
    }, []);
}
