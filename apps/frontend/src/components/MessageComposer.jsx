import {
    MAX_MESSAGE_WORDS,
    SEND_STATE,
    countMessageWords,
    validateMessageDraft
} from "../data/messageRules.js";
import "./MessageComposer.css";

const TOUCH_POINTER_QUERY = "(pointer: coarse)";

/**
 * Tells whether a key press asks to send the draft. Touch keyboards have no Shift key,
 * so on touch screens Enter keeps breaking the line and sending uses the button.
 *
 * @param {KeyboardEvent} event - Key press inside the textarea.
 * @param {boolean} isTouchScreen - Whether the device uses a touch pointer.
 * @returns {boolean} True when Enter should send the draft.
 */
function isSendShortcut(event, isTouchScreen) {
    return (
        event.key === "Enter" &&
        !event.shiftKey &&
        !isTouchScreen &&
        !event.nativeEvent.isComposing
    );
}

/**
 * Text area and send button used to write a private message.
 *
 * @param {Object} props - Component props.
 * @param {string} props.draft - Current composer text.
 * @param {{status: string, errorKey: string|null}} props.sendState - Send status.
 * @param {(key: string, values?: Object) => string} props.translate - Translation function.
 * @param {(text: string) => void} props.onDraftChange - Updates the composer text.
 * @param {() => void} props.onSubmit - Sends the composer text.
 * @returns {JSX.Element} The rendered composer.
 */
function MessageComposer({ draft, sendState, translate, onDraftChange, onSubmit }) {
    const isSending = sendState.status === SEND_STATE.SENDING;
    const isTouchScreen = window.matchMedia(TOUCH_POINTER_QUERY).matches;
    const draftError = validateMessageDraft(draft);
    const canSend = draftError === null && !isSending;
    const isOverLimit = draftError === "tooLong";

    function sendDraft() {
        if (canSend) {
            onSubmit();
        }
    }

    return (
        <form
            className="message-composer"
            onSubmit={(event) => {
                event.preventDefault();
                sendDraft();
            }}
        >
            <label htmlFor="message-composer-input" className="message-composer-label">
                {translate("messages.composerLabel")}
            </label>
            <textarea
                id="message-composer-input"
                className="message-composer-input"
                rows={2}
                value={draft}
                placeholder={translate("messages.composerPlaceholder")}
                disabled={isSending}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                    if (isSendShortcut(event, isTouchScreen)) {
                        event.preventDefault();
                        sendDraft();
                    }
                }}
            />
            <div className="message-composer-footer">
                <span
                    className={
                        isOverLimit
                            ? "message-composer-count message-composer-count--over"
                            : "message-composer-count"
                    }
                >
                    {translate("messages.wordCount", {
                        count: countMessageWords(draft),
                        max: MAX_MESSAGE_WORDS
                    })}
                </span>
                <button type="submit" className="message-composer-send" disabled={!canSend}>
                    {translate(isSending ? "messages.sending" : "messages.send")}
                </button>
            </div>
            {sendState.errorKey && (
                <p className="message-composer-error" role="alert">
                    {translate(sendState.errorKey)}
                </p>
            )}
        </form>
    );
}

export default MessageComposer;
