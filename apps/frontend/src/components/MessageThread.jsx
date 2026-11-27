import { LOAD_STATE } from "../data/messageRules.js";
import MessageBubbleList from "./MessageBubbleList.jsx";
import MessageComposer from "./MessageComposer.jsx";
import MessageThreadHeader from "./MessageThreadHeader.jsx";
import "./MessageThread.css";

/**
 * Renders the header, history and composer of one private conversation.
 *
 * @param {Object} props - Component props.
 * @param {string|null} props.activePeerId - Peer of the open conversation.
 * @param {{peer: Object|null, messages: Array<Object>, total: number}} props.thread - Loaded thread.
 * @param {string} props.threadState - Loading state of the thread.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {string} props.language - Current application language code.
 * @param {(key: string, values?: Object) => string} props.translate - Translation function.
 * @param {boolean} props.hasOlderMessages - Whether earlier messages can be loaded.
 * @param {boolean} props.isLoadingOlder - Whether an older page is being loaded.
 * @param {() => void} props.onLoadOlder - Loads the previous page of history.
 * @param {string} props.draft - Current composer text.
 * @param {(text: string) => void} props.onDraftChange - Updates the composer text.
 * @param {{status: string, errorKey: string|null}} props.sendState - Send status.
 * @param {() => void} props.onSubmit - Sends the composer text.
 * @param {boolean} props.isBlocking - Whether a block request is in progress.
 * @param {string|null} props.blockErrorKey - Translation key of the last block error.
 * @param {() => void} props.onBlock - Blocks the peer of the open conversation.
 * @returns {JSX.Element} The rendered thread.
 */
function MessageThread({
    activePeerId,
    thread,
    threadState,
    currentUserId,
    language,
    translate,
    hasOlderMessages,
    isLoadingOlder,
    onLoadOlder,
    draft,
    onDraftChange,
    sendState,
    onSubmit,
    isBlocking,
    blockErrorKey,
    onBlock
}) {
    if (activePeerId === null) {
        return <p className="message-thread-state">{translate("messages.selectConversation")}</p>;
    }
    if (threadState === LOAD_STATE.LOADING) {
        return <p className="message-thread-state">{translate("messages.loadingThread")}</p>;
    }
    if (threadState === LOAD_STATE.ERROR) {
        return <p className="message-thread-state" role="alert">{translate("messages.errors.thread")}</p>;
    }

    return (
        <section className="message-thread">
            <MessageThreadHeader
                peer={thread.peer}
                isBlocking={isBlocking}
                blockErrorKey={blockErrorKey}
                translate={translate}
                onBlock={onBlock}
            />
            <MessageBubbleList
                messages={thread.messages}
                currentUserId={currentUserId}
                language={language}
                translate={translate}
                hasOlderMessages={hasOlderMessages}
                isLoadingOlder={isLoadingOlder}
                onLoadOlder={onLoadOlder}
            />
            <MessageComposer
                draft={draft}
                sendState={sendState}
                translate={translate}
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
            />
        </section>
    );
}

export default MessageThread;
