import { useState } from "react";
import { getProfileInitials } from "../services/followService.js";
import "./MessageThreadHeader.css";

/**
 * Header of an open conversation: peer identity and the block action, which
 * asks for confirmation before it takes effect.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.peer - Account of the other participant.
 * @param {boolean} props.isBlocking - Whether a block request is in progress.
 * @param {string|null} props.blockErrorKey - Translation key of the last block error.
 * @param {(key: string, values?: Object) => string} props.translate - Translation function.
 * @param {() => void} props.onBlock - Blocks the peer.
 * @returns {JSX.Element} The rendered header.
 */
function MessageThreadHeader({ peer, isBlocking, blockErrorKey, translate, onBlock }) {
    const [isConfirming, setIsConfirming] = useState(false);
    const peerName = peer.display_name || peer.username;

    return (
        <header className="message-thread-header">
            <span className="message-thread-avatar" aria-hidden="true">
                {getProfileInitials(peerName)}
            </span>
            <div className="message-thread-identity">
                <h2 className="message-thread-name">{peerName}</h2>
                <p className="message-thread-handle">@{peer.username}</p>
            </div>
            <div className="message-thread-block">
                {isConfirming ? (
                    <div className="message-thread-block-confirm" role="group">
                        <p>{translate("privacy.confirmBlock", { name: peerName })}</p>
                        <button
                            type="button"
                            className="message-thread-block-action"
                            disabled={isBlocking}
                            onClick={onBlock}
                        >
                            {translate("privacy.block")}
                        </button>
                        <button
                            type="button"
                            className="message-thread-block-cancel"
                            disabled={isBlocking}
                            onClick={() => setIsConfirming(false)}
                        >
                            {translate("follows.confirmCancel")}
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="message-thread-block-button"
                        onClick={() => setIsConfirming(true)}
                    >
                        {translate("privacy.block")}
                    </button>
                )}
                {blockErrorKey && (
                    <p className="message-thread-block-error" role="alert">
                        {translate(blockErrorKey)}
                    </p>
                )}
            </div>
        </header>
    );
}

export default MessageThreadHeader;
