import { useEffect, useRef, useState } from "react";
import "./MessageBubbleList.css";

const NEAR_BOTTOM_THRESHOLD_PX = 80;

/**
 * Tells whether the history is scrolled close enough to the latest message to follow new ones.
 *
 * @param {HTMLElement} element - Scrollable history container.
 * @returns {boolean} True when the latest message is visible or almost visible.
 */
function isNearBottom(element) {
    return element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_BOTTOM_THRESHOLD_PX;
}

/**
 * Formats the send time of a message bubble.
 *
 * @param {string} sentAt - ISO timestamp returned by the server.
 * @param {string} language - Current application language code.
 * @returns {string} Localized time of day.
 */
function formatBubbleTime(sentAt, language) {
    return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" })
        .format(new Date(sentAt));
}

/**
 * Scrollable history of a conversation, with the control that loads earlier pages.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.messages - Messages in chronological order.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {string} props.language - Current application language code.
 * @param {(key: string) => string} props.translate - Translation function.
 * @param {boolean} props.hasOlderMessages - Whether earlier messages can be loaded.
 * @param {boolean} props.isLoadingOlder - Whether an older page is being loaded.
 * @param {() => void} props.onLoadOlder - Loads the previous page of history.
 * @returns {JSX.Element} The rendered history.
 */
function MessageBubbleList({
    messages,
    currentUserId,
    language,
    translate,
    hasOlderMessages,
    isLoadingOlder,
    onLoadOlder
}) {
    const listRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const previousLastMessageIdRef = useRef(null);
    const [hasNewMessages, setHasNewMessages] = useState(false);
    const lastMessage = messages.at(-1);
    const lastMessageId = lastMessage?.id_message ?? null;
    const isLastMessageMine = lastMessage?.id_sender === currentUserId;

    useEffect(() => {
        if (lastMessageId === null || lastMessageId === previousLastMessageIdRef.current) {
            return;
        }
        const isInitialLoad = previousLastMessageIdRef.current === null;
        previousLastMessageIdRef.current = lastMessageId;
        if (isInitialLoad) {
            listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "auto" });
        } else if (isLastMessageMine || isNearBottomRef.current) {
            listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            setHasNewMessages(false);
        } else {
            setHasNewMessages(true);
        }
    }, [lastMessageId, isLastMessageMine]);

    function handleScroll(event) {
        isNearBottomRef.current = isNearBottom(event.currentTarget);
        if (isNearBottomRef.current) {
            setHasNewMessages(false);
        }
    }

    function jumpToLatest() {
        listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        setHasNewMessages(false);
    }

    return (
        <div className="message-bubble-list" ref={listRef} onScroll={handleScroll}>
            {hasOlderMessages && (
                <button
                    type="button"
                    className="message-bubble-load-older"
                    disabled={isLoadingOlder}
                    onClick={onLoadOlder}
                >
                    {translate("messages.loadOlder")}
                </button>
            )}
            {messages.length === 0 && (
                <p className="message-bubble-empty">{translate("messages.emptyThread")}</p>
            )}
            {messages.map((message) => {
                const isMine = message.id_sender === currentUserId;
                return (
                    <div
                        key={message.id_message}
                        className={`message-bubble${isMine ? " message-bubble--mine" : ""}`}
                    >
                        <p className="message-bubble-text">{message.content}</p>
                        <time className="message-bubble-time" dateTime={message.sent_at}>
                            {formatBubbleTime(message.sent_at, language)}
                        </time>
                    </div>
                );
            })}
            {hasNewMessages && (
                <button type="button" className="message-bubble-jump-latest" onClick={jumpToLatest}>
                    {translate("messages.newMessages")}
                </button>
            )}
        </div>
    );
}

export default MessageBubbleList;
