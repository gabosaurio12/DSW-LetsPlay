import { getProfileInitials } from "../services/followService.js";
import "./ConversationList.css";

/**
 * Formats the send time of a message for the conversation list.
 *
 * @param {string} sentAt - ISO timestamp returned by the server.
 * @param {string} language - Current application language code.
 * @returns {string} Localized time of day.
 */
function formatSentTime(sentAt, language) {
    return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" })
        .format(new Date(sentAt));
}

/**
 * Inbox list of private conversations, one row per peer with the last message preview.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.conversations - Conversations sorted by recency.
 * @param {string|null} props.activePeerId - Peer of the open conversation.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {string} props.language - Current application language code.
 * @param {(key: string) => string} props.translate - Translation function.
 * @param {(peerId: string) => void} props.onSelect - Opens the conversation with a peer.
 * @returns {JSX.Element} The rendered conversation list.
 */
function ConversationList({
    conversations,
    activePeerId,
    currentUserId,
    language,
    translate,
    onSelect
}) {
    if (conversations.length === 0) {
        return <p className="conversation-list-empty">{translate("messages.emptyConversations")}</p>;
    }

    return (
        <ul className="conversation-list">
            {conversations.map((conversation) => {
                const name = conversation.display_name || conversation.username;
                const isActive = conversation.id_user === activePeerId;
                const isOwnLast = conversation.last_sender_id === currentUserId;
                return (
                    <li key={conversation.id_user}>
                        <button
                            type="button"
                            className={`conversation-item${isActive ? " conversation-item--active" : ""}`}
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => onSelect(conversation.id_user)}
                        >
                            <span className="conversation-avatar" aria-hidden="true">
                                {getProfileInitials(name)}
                            </span>
                            <span className="conversation-body">
                                <span className="conversation-header">
                                    <span className="conversation-name">{name}</span>
                                    <time className="conversation-time" dateTime={conversation.last_sent_at}>
                                        {formatSentTime(conversation.last_sent_at, language)}
                                    </time>
                                </span>
                                <span className="conversation-preview">
                                    {isOwnLast && `${translate("messages.youPrefix")} `}
                                    {conversation.last_content}
                                </span>
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export default ConversationList;
