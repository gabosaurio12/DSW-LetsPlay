import { useTranslation } from "../hooks/useTranslation.js";
import { useMessaging } from "../hooks/useMessaging.js";
import { LOAD_STATE } from "../data/messageRules.js";
import ConversationList from "../components/ConversationList.jsx";
import MessageThread from "../components/MessageThread.jsx";
import "./Messages.css";

/**
 * Private messages page: inbox of conversations and the open thread, updated in real time.
 *
 * @param {Object} props - Component props.
 * @param {string} props.language - Current application language code.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {string|null} props.initialPeerId - Account whose conversation opens first.
 * @param {() => void} props.onSessionExpired - Handles an expired session.
 * @returns {JSX.Element} The rendered messages page.
 */
function Messages({ language, currentUserId, initialPeerId, onSessionExpired }) {
    const translate = useTranslation(language);
    const messaging = useMessaging({ initialPeerId, onSessionExpired });

    function renderInbox() {
        if (messaging.conversationsState === LOAD_STATE.LOADING) {
            return <p className="messages-state">{translate("messages.loadingConversations")}</p>;
        }
        if (messaging.conversationsState === LOAD_STATE.ERROR) {
            return (
                <div className="messages-state" role="alert">
                    <p>{translate("messages.errors.conversations")}</p>
                    <button
                        type="button"
                        className="messages-retry"
                        onClick={messaging.retryConversations}
                    >
                        {translate("messages.retry")}
                    </button>
                </div>
            );
        }
        return (
            <ConversationList
                conversations={messaging.conversations}
                activePeerId={messaging.activePeerId}
                currentUserId={currentUserId}
                language={language}
                translate={translate}
                onSelect={messaging.selectPeer}
            />
        );
    }

    return (
        <section className="messages-page">
            <h1 className="messages-title">{translate("messages.title")}</h1>
            <div className="messages-layout">
                <aside className="messages-inbox" aria-label={translate("messages.conversations")}>
                    <h2 className="messages-inbox-title">{translate("messages.conversations")}</h2>
                    {renderInbox()}
                </aside>
                <div className="messages-thread-pane">
                    <MessageThread
                        activePeerId={messaging.activePeerId}
                        thread={messaging.thread}
                        threadState={messaging.threadState}
                        currentUserId={currentUserId}
                        language={language}
                        translate={translate}
                        hasOlderMessages={messaging.hasOlderMessages}
                        isLoadingOlder={messaging.isLoadingOlder}
                        onLoadOlder={messaging.loadOlderMessages}
                        draft={messaging.draft}
                        onDraftChange={messaging.changeDraft}
                        sendState={messaging.sendState}
                        onSubmit={messaging.submitDraft}
                        isBlocking={messaging.isBlocking}
                        blockErrorKey={messaging.blockErrorKey}
                        onBlock={messaging.blockActivePeer}
                    />
                </div>
            </div>
        </section>
    );
}

export default Messages;
