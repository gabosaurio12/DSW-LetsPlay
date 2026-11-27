import { useEffect, useState } from "react";
import {
    fetchFollowList,
    getProfileInitials,
    unfollowUser
} from "../services/followService.js";
import "./FollowListModal.css";

const PAGE_SIZE = 20;
const UNAUTHORIZED_STATUS = 401;
const TABS = {
    FOLLOWERS: "followers",
    FOLLOWING: "following"
};

/**
 * Shows the followers or followed accounts of a profile as a modal dialog.
 *
 * @param {Object} props - Component props.
 * @param {string} props.userId - Profile owner uuid.
 * @param {string} props.displayName - Profile owner display name.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {{followers: number, following: number}} props.counts - Visible connection counts.
 * @param {(key: string, values?: Object|null) => string} props.translate - Translation function.
 * @param {() => void} props.onClose - Closes the dialog.
 * @param {(userId: string) => void} props.onOpenProfile - Opens another profile.
 * @param {() => void} props.onSessionExpired - Handles an expired session.
 * @param {() => void} [props.onUnfollow] - Notifies a successful unfollow.
 * @returns {JSX.Element} The rendered dialog.
 */
function FollowListModal({
    userId,
    displayName,
    currentUserId,
    counts,
    translate,
    onClose,
    onOpenProfile,
    onSessionExpired,
    onUnfollow = () => {}
}) {
    const [activeTab, setActiveTab] = useState(TABS.FOLLOWERS);
    const [listState, setListState] = useState({
        key: "", users: [], errorKey: null, isLoading: true
    });
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [confirmKey, setConfirmKey] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const requestKey = `${userId}|${activeTab}`;
    const isCurrent = listState.key === requestKey;
    const users = isCurrent ? listState.users : [];
    const errorKey = isCurrent ? listState.errorKey : null;
    const isLoading = !isCurrent || listState.isLoading;

    useEffect(() => {
        function handleEscape(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        fetchFollowList(userId, activeTab, { limit: PAGE_SIZE, signal: controller.signal })
            .then((data) => {
                if (isActive) {
                    setListState({
                        key: requestKey,
                        users: Array.isArray(data.users) ? data.users : [],
                        errorKey: null,
                        isLoading: false
                    });
                }
            })
            .catch((error) => {
                if (!isActive || error.name === "AbortError") {
                    return;
                }
                if (error.status === UNAUTHORIZED_STATUS) {
                    onSessionExpired();
                    return;
                }
                const errorKey = error.status === 403 || error.status === 404
                    ? "follows.states.unavailable"
                    : "follows.errors.loadList";
                setListState({ key: requestKey, users: [], errorKey, isLoading: false });
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [userId, activeTab, requestKey, onSessionExpired]);

    async function handleLoadMore() {
        setIsLoadingMore(true);
        setListState((prev) => ({ ...prev, errorKey: null }));
        try {
            const data = await fetchFollowList(userId, activeTab, {
                limit: PAGE_SIZE,
                offset: users.length
            });
            setListState((prev) => ({
                ...prev,
                users: [...prev.users, ...(data.users || [])]
            }));
        } catch (error) {
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
                return;
            }
            setListState((prev) => ({ ...prev, errorKey: "follows.errors.loadList" }));
        } finally {
            setIsLoadingMore(false);
        }
    }

    async function handleUnfollow(targetId) {
        setIsUpdating(true);
        setListState((prev) => ({ ...prev, errorKey: null }));
        try {
            await unfollowUser(targetId);
            setListState((prev) => ({
                ...prev,
                users: prev.users.filter((user) => user.id_user !== targetId)
            }));
            setConfirmKey("");
            onUnfollow();
        } catch (error) {
            if (error.status === UNAUTHORIZED_STATUS) {
                onSessionExpired();
                return;
            }
            setListState((prev) => ({ ...prev, errorKey: "follows.errors.update" }));
        } finally {
            setIsUpdating(false);
        }
    }

    const total = activeTab === TABS.FOLLOWERS ? counts.followers : counts.following;
    const hasMore = users.length < total;

    return (
        <div
            className="follows-modal-overlay"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="follows-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="follows-modal-title"
            >
                <div className="follows-modal-header">
                    <h2 id="follows-modal-title" className="follows-modal-title">
                        {translate("follows.connectionsTitle", { name: displayName })}
                    </h2>
                    <button
                        type="button"
                        className="follows-modal-close"
                        aria-label={translate("follows.close")}
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div
                    className="follows-modal-tabs"
                    role="tablist"
                    aria-label={translate("follows.followers")}
                >
                    {[TABS.FOLLOWERS, TABS.FOLLOWING].map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={`follows-modal-tab${
                                activeTab === tab ? " follows-modal-tab--active" : ""
                            }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {translate(tab === TABS.FOLLOWERS
                                ? "follows.followers"
                                : "follows.followed")}
                            {" "}
                            ({tab === TABS.FOLLOWERS ? counts.followers : counts.following})
                        </button>
                    ))}
                </div>

                <div className="follows-modal-body">
                    {isLoading && (
                        <p className="follows-modal-state">
                            {translate("follows.states.listLoading")}
                        </p>
                    )}
                    {!isLoading && errorKey !== null && (
                        <p className="follows-modal-state" role="alert">{translate(errorKey)}</p>
                    )}
                    {!isLoading && errorKey === null && users.length === 0 && (
                        <p className="follows-modal-state">{translate("follows.states.empty")}</p>
                    )}
                    {users.map((user) => {
                        const isSelf = user.id_user === currentUserId;
                        const name = user.display_name || user.username;
                        const userConfirmKey = `${requestKey}|${user.id_user}`;
                        const isConfirming = confirmKey === userConfirmKey;
                        return (
                            <div key={user.id_user} className="follows-row">
                                <button
                                    type="button"
                                    className="follows-row-identity"
                                    aria-label={translate("follows.viewProfile", { name })}
                                    onClick={() => onOpenProfile(user.id_user)}
                                >
                                    <span className="follows-row-avatar" aria-hidden="true">
                                        {getProfileInitials(name)}
                                    </span>
                                    <span className="follows-row-text">
                                        <span className="follows-row-name">{name}</span>
                                        <span className="follows-row-handle">@{user.username}</span>
                                    </span>
                                    {isSelf && (
                                        <span className="follows-row-self">
                                            {translate("follows.selfBadge")}
                                        </span>
                                    )}
                                </button>
                                {activeTab === TABS.FOLLOWING && !isSelf && (
                                    isConfirming ? (
                                        <div className="follows-row-confirm">
                                            <span>
                                                {translate("follows.confirmUnfollow", { name })}
                                            </span>
                                            <button
                                                type="button"
                                                className="follows-row-button"
                                                disabled={isUpdating}
                                                onClick={() => handleUnfollow(user.id_user)}
                                            >
                                                {translate("follows.confirmAction")}
                                            </button>
                                            <button
                                                type="button"
                                                className={[
                                                    "follows-row-button",
                                                    "follows-row-button--ghost"
                                                ].join(" ")}
                                                disabled={isUpdating}
                                                onClick={() => setConfirmKey("")}
                                            >
                                                {translate("follows.confirmCancel")}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="follows-row-following"
                                            onClick={() => setConfirmKey(userConfirmKey)}
                                        >
                                            {translate("follows.following")}
                                        </button>
                                    )
                                )}
                            </div>
                        );
                    })}
                    {hasMore && !isLoading && errorKey === null && (
                        <button
                            type="button"
                            className="follows-modal-more"
                            disabled={isLoadingMore}
                            onClick={handleLoadMore}
                        >
                            {translate("follows.loadMore")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FollowListModal;
