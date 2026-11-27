import { useCallback, useEffect, useState } from "react";
import {
    LOAD_STATE,
    SEND_STATE,
    validateMessageDraft
} from "../data/messageRules.js";
import { blockUser } from "../services/followService.js";
import {
    fetchConversations,
    fetchThread,
    sendMessage
} from "../services/messageService.js";
import { useMessageSocket } from "./useMessageSocket.js";

const THREAD_PAGE_SIZE = 30;
const CONVERSATION_PAGE_SIZE = 50;
const MESSAGE_CREATED_EVENT = "message.created";
const UNAUTHORIZED_STATUS = 401;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const EMPTY_THREAD = { peer: null, messages: [], total: 0 };

/**
 * Merges messages by id and keeps them in chronological order.
 *
 * @param {Array<Object>} current - Messages already shown.
 * @param {Array<Object>} incoming - Messages to add.
 * @returns {Array<Object>} Unique messages sorted by send time.
 */
function mergeMessages(current, incoming) {
    const byId = new Map(current.map((message) => [message.id_message, message]));
    incoming.forEach((message) => byId.set(message.id_message, message));
    return [...byId.values()].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
}

/**
 * Maps a failed send to the translation key shown to the user.
 *
 * @param {{status?: number}} error - Error thrown by the message service.
 * @returns {string} Translation key.
 */
function toSendErrorKey(error) {
    if (error.status === FORBIDDEN_STATUS) {
        return "messages.errors.followRequired";
    }
    if (error.status === NOT_FOUND_STATUS) {
        return "messages.errors.unavailable";
    }
    return "messages.errors.send";
}

/**
 * Tells whether a message belongs to the conversation with the given peer.
 *
 * @param {Object} message - Message received from the server.
 * @param {string|null} peerId - Account uuid of the open conversation.
 * @returns {boolean} True when the message was sent by or to the peer.
 */
function belongsToPeer(message, peerId) {
    return peerId !== null
        && (message.id_sender === peerId || message.id_recipient === peerId);
}

/**
 * State and actions of the private messages page: inbox, open thread, sending
 * and real-time updates through the message socket.
 *
 * @param {Object} options - Hook options.
 * @param {string|null} options.initialPeerId - Account to open first, if any.
 * @param {() => void} options.onSessionExpired - Handles an expired session.
 * @returns {Object} Page state and actions.
 * @example
 * const messaging = useMessaging({ initialPeerId: null, onSessionExpired });
 */
export function useMessaging({ initialPeerId, onSessionExpired }) {
    const [conversations, setConversations] = useState([]);
    const [conversationsState, setConversationsState] = useState(LOAD_STATE.LOADING);
    const [activePeerId, setActivePeerId] = useState(initialPeerId);
    const [thread, setThread] = useState(EMPTY_THREAD);
    const [threadState, setThreadState] = useState(
        initialPeerId === null ? LOAD_STATE.IDLE : LOAD_STATE.LOADING
    );
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [draft, setDraft] = useState("");
    const [sendState, setSendState] = useState({ status: SEND_STATE.IDLE, errorKey: null });
    const [isBlocking, setIsBlocking] = useState(false);
    const [blockErrorKey, setBlockErrorKey] = useState(null);

    const refreshConversations = useCallback(async () => {
        try {
            const data = await fetchConversations({ limit: CONVERSATION_PAGE_SIZE });
            setConversations(data.conversations);
            setConversationsState(LOAD_STATE.READY);
        } catch (error) {
            console.error("useMessaging.refreshConversations", error);
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
                return;
            }
            setConversationsState(LOAD_STATE.ERROR);
        }
    }, [onSessionExpired]);

    useEffect(() => {
        let isActive = true;
        const loadInitialConversations = async () => {
            try {
                const data = await fetchConversations({ limit: CONVERSATION_PAGE_SIZE });
                if (isActive) {
                    setConversations(data.conversations);
                    setConversationsState(LOAD_STATE.READY);
                }
            } catch (error) {
                if (!isActive) {
                    return;
                }
                console.error("useMessaging.loadInitialConversations", error);
                if (error.status === UNAUTHORIZED_STATUS) {
                    onSessionExpired();
                    return;
                }
                setConversationsState(LOAD_STATE.ERROR);
            }
        };
        loadInitialConversations();
        return () => {
            isActive = false;
        };
    }, [onSessionExpired]);

    useEffect(() => {
        if (activePeerId === null) {
            return undefined;
        }
        let isActive = true;
        const loadThread = async () => {
            try {
                const data = await fetchThread(activePeerId, { limit: THREAD_PAGE_SIZE });
                if (isActive) {
                    setThread({ peer: data.peer, messages: data.messages, total: data.total });
                    setThreadState(LOAD_STATE.READY);
                }
            } catch (error) {
                if (!isActive) {
                    return;
                }
                console.error("useMessaging.loadThread", error);
                if (error.status === UNAUTHORIZED_STATUS) {
                    onSessionExpired();
                    return;
                }
                setThreadState(LOAD_STATE.ERROR);
            }
        };
        loadThread();
        return () => {
            isActive = false;
        };
    }, [activePeerId, onSessionExpired]);

    const appendToThread = useCallback((incoming) => {
        setThread((previous) => {
            const messages = mergeMessages(previous.messages, incoming);
            const added = messages.length - previous.messages.length;
            return { ...previous, messages, total: previous.total + added };
        });
    }, []);

    const handleSocketEvent = useCallback((event) => {
        if (event.type !== MESSAGE_CREATED_EVENT) {
            return;
        }
        refreshConversations();
        if (belongsToPeer(event.message, activePeerId)) {
            appendToThread([event.message]);
        }
    }, [activePeerId, appendToThread, refreshConversations]);

    useMessageSocket(handleSocketEvent);

    function selectPeer(peerId) {
        setActivePeerId(peerId);
        setThread(EMPTY_THREAD);
        setThreadState(peerId === null ? LOAD_STATE.IDLE : LOAD_STATE.LOADING);
        setBlockErrorKey(null);
    }

    async function blockActivePeer() {
        setIsBlocking(true);
        setBlockErrorKey(null);
        try {
            await blockUser(activePeerId);
            selectPeer(null);
            refreshConversations();
        } catch (error) {
            console.error("useMessaging.blockActivePeer", error);
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
                return;
            }
            setBlockErrorKey("messages.errors.block");
        } finally {
            setIsBlocking(false);
        }
    }

    async function loadOlderMessages() {
        setIsLoadingOlder(true);
        try {
            const data = await fetchThread(activePeerId, {
                limit: THREAD_PAGE_SIZE,
                offset: thread.messages.length
            });
            appendToThread(data.messages);
        } catch (error) {
            console.error("useMessaging.loadOlderMessages", error);
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
            }
        } finally {
            setIsLoadingOlder(false);
        }
    }

    async function submitDraft() {
        const errorKey = validateMessageDraft(draft);
        if (errorKey !== null) {
            setSendState({ status: SEND_STATE.ERROR, errorKey: `messages.errors.${errorKey}` });
            return;
        }
        setSendState({ status: SEND_STATE.SENDING, errorKey: null });
        try {
            const { message } = await sendMessage(activePeerId, draft.trim());
            appendToThread([message]);
            setDraft("");
            setSendState({ status: SEND_STATE.IDLE, errorKey: null });
            refreshConversations();
        } catch (error) {
            console.error("useMessaging.submitDraft", error);
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
                return;
            }
            setSendState({ status: SEND_STATE.ERROR, errorKey: toSendErrorKey(error) });
        }
    }

    return {
        conversations,
        conversationsState,
        activePeerId,
        thread,
        threadState,
        isLoadingOlder,
        hasOlderMessages: thread.messages.length < thread.total,
        draft,
        sendState,
        selectPeer,
        changeDraft: setDraft,
        submitDraft,
        loadOlderMessages,
        isBlocking,
        blockErrorKey,
        blockActivePeer,
        retryConversations: refreshConversations
    };
}
