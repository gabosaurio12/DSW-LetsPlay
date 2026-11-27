import { useEffect, useState } from "react";
import {
    fetchBlockedUsers,
    fetchFollowRequests,
    fetchPrivacy,
    getProfileInitials,
    resolveFollowRequest,
    unblockUser,
    updatePrivacy
} from "../services/followService.js";
import "./AccountPrivacySection.css";

const UNAUTHORIZED_STATUS = 401;
const PAGE_SIZE = 50;

/**
 * Renders privacy controls, incoming follow requests, and blocked accounts.
 *
 * @param {Object} props - Component props.
 * @param {(key: string, values?: Object|null) => string} props.translate - Translation function.
 * @param {() => void} props.onSessionExpired - Handles an expired session.
 * @param {(userId: string) => void} props.onOpenUserProfile - Opens an account profile.
 * @param {() => void} props.onRequestAccepted - Updates the local follower count.
 * @returns {JSX.Element} Privacy and social-account settings.
 */
function AccountPrivacySection({
    translate,
    onSessionExpired,
    onOpenUserProfile,
    onRequestAccepted
}) {
    const [isPrivate, setIsPrivate] = useState(false);
    const [requests, setRequests] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [requestTotal, setRequestTotal] = useState(0);
    const [blockedTotal, setBlockedTotal] = useState(0);
    const [confirmUnblockId, setConfirmUnblockId] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [errorKey, setErrorKey] = useState(null);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();
        const loadSettings = async () => {
            try {
                const [privacy, requestData, blockData] = await Promise.all([
                    fetchPrivacy({ signal: controller.signal }),
                    fetchFollowRequests({ limit: PAGE_SIZE, signal: controller.signal }),
                    fetchBlockedUsers({ limit: PAGE_SIZE, signal: controller.signal })
                ]);
                if (isActive) {
                    setIsPrivate(privacy.isPrivate);
                    setRequests(requestData.users || []);
                    setRequestTotal(requestData.total || 0);
                    setBlockedUsers(blockData.users || []);
                    setBlockedTotal(blockData.total || 0);
                    setIsLoading(false);
                }
            } catch (error) {
                if (!isActive || error.name === "AbortError") {
                    return;
                }
                if (error.status === UNAUTHORIZED_STATUS) {
                    onSessionExpired();
                    return;
                }
                setErrorKey("privacy.errors.load");
                setIsLoading(false);
            }
        };
        loadSettings();
        return () => {
            isActive = false;
            controller.abort();
        };
    }, [onSessionExpired]);

    async function handlePrivacyToggle() {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            const saved = await updatePrivacy(!isPrivate);
            setIsPrivate(saved.isPrivate);
        } catch (error) {
            handleError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleRequest(requesterId, action) {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            await resolveFollowRequest(requesterId, action);
            setRequests((previous) => previous.filter((user) => user.id_user !== requesterId));
            setRequestTotal((previous) => Math.max(0, previous - 1));
            if (action === "accept") {
                onRequestAccepted();
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleUnblock(userId) {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            await unblockUser(userId);
            setBlockedUsers((previous) => previous.filter((user) => user.id_user !== userId));
            setBlockedTotal((previous) => Math.max(0, previous - 1));
            setConfirmUnblockId(null);
        } catch (error) {
            handleError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    function handleError(error) {
        if (error.status === UNAUTHORIZED_STATUS) {
            onSessionExpired();
            return;
        }
        setErrorKey("privacy.errors.action");
    }

    async function loadMore(listType) {
        setIsLoadingMore(true);
        setErrorKey(null);
        try {
            const data = listType === "requests"
                ? await fetchFollowRequests({
                    limit: PAGE_SIZE,
                    offset: requests.length
                })
                : await fetchBlockedUsers({
                    limit: PAGE_SIZE,
                    offset: blockedUsers.length
                });
            if (listType === "requests") {
                setRequests((previous) => [...previous, ...(data.users || [])]);
            } else {
                setBlockedUsers((previous) => [...previous, ...(data.users || [])]);
            }
        } catch (error) {
            handleError(error);
        } finally {
            setIsLoadingMore(false);
        }
    }

    if (isLoading) {
        return <p className="privacy-state">{translate("privacy.loading")}</p>;
    }

    return (
        <section className="privacy-settings" aria-labelledby="privacy-settings-title">
            <h2 id="privacy-settings-title" className="privacy-settings-title">
                {translate("privacy.title")}
            </h2>
            <section className="privacy-settings-section">
                <h3>{translate("privacy.accountTitle")}</h3>
                <p>
                    {translate(isPrivate
                        ? "privacy.privateDescription"
                        : "privacy.publicDescription")}
                </p>
                <button
                    type="button"
                    className="privacy-action"
                    disabled={isUpdating}
                    onClick={handlePrivacyToggle}
                >
                    {translate(isPrivate ? "privacy.makePublic" : "privacy.makePrivate")}
                </button>
            </section>

            <section className="privacy-settings-section">
                <h3>{translate("privacy.requestsTitle", { count: requestTotal })}</h3>
                {requests.length === 0 ? (
                    <p>{translate("privacy.noRequests")}</p>
                ) : (
                    <div className="privacy-account-list">
                        {requests.map((user) => (
                            <div className="privacy-account-row" key={user.id_user}>
                                <button
                                    type="button"
                                    className="privacy-account-identity"
                                    onClick={() => onOpenUserProfile(user.id_user)}
                                >
                                    <span className="privacy-account-avatar" aria-hidden="true">
                                        {getProfileInitials(user.display_name || user.username)}
                                    </span>
                                    <span>
                                        <strong>{user.display_name || user.username}</strong>
                                        <small>@{user.username}</small>
                                    </span>
                                </button>
                                <div className="privacy-account-actions">
                                    <button
                                        type="button"
                                        className="privacy-action"
                                        disabled={isUpdating}
                                        onClick={() => handleRequest(user.id_user, "accept")}
                                    >
                                        {translate("privacy.accept")}
                                    </button>
                                    <button
                                        type="button"
                                        className="privacy-action privacy-action--secondary"
                                        disabled={isUpdating}
                                        onClick={() => handleRequest(user.id_user, "reject")}
                                    >
                                        {translate("privacy.reject")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {requests.length < requestTotal && (
                    <button
                        type="button"
                        className="privacy-action privacy-action--secondary"
                        disabled={isUpdating || isLoadingMore}
                        onClick={() => loadMore("requests")}
                    >
                        {translate("privacy.loadMore")}
                    </button>
                )}
            </section>

            <section className="privacy-settings-section">
                <h3>{translate("privacy.blockedTitle")}</h3>
                {blockedUsers.length === 0 ? (
                    <p>{translate("privacy.noBlockedUsers")}</p>
                ) : (
                    <div className="privacy-account-list">
                        {blockedUsers.map((user) => (
                            <div className="privacy-account-row" key={user.id_user}>
                                <div className="privacy-account-identity">
                                    <span className="privacy-account-avatar" aria-hidden="true">
                                        {getProfileInitials(user.display_name || user.username)}
                                    </span>
                                    <span>
                                        <strong>{user.display_name || user.username}</strong>
                                        <small>@{user.username}</small>
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="privacy-action privacy-action--secondary"
                                    disabled={isUpdating}
                                    onClick={() => setConfirmUnblockId(user.id_user)}
                                >
                                    {translate("privacy.unblock")}
                                </button>
                                {confirmUnblockId === user.id_user && (
                                    <div className="privacy-unblock-confirm">
                                        <span>{translate("privacy.confirmUnblock", {
                                            name: user.display_name || user.username
                                        })}</span>
                                        <button
                                            type="button"
                                            className="privacy-action"
                                            disabled={isUpdating}
                                            onClick={() => handleUnblock(user.id_user)}
                                        >
                                            {translate("privacy.unblock")}
                                        </button>
                                        <button
                                            type="button"
                                            className="privacy-action privacy-action--secondary"
                                            disabled={isUpdating}
                                            onClick={() => setConfirmUnblockId(null)}
                                        >
                                            {translate("follows.confirmCancel")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {blockedUsers.length < blockedTotal && (
                    <button
                        type="button"
                        className="privacy-action privacy-action--secondary"
                        disabled={isUpdating || isLoadingMore}
                        onClick={() => loadMore("blocks")}
                    >
                        {translate("privacy.loadMore")}
                    </button>
                )}
            </section>
            {errorKey !== null && (
                <p className="privacy-error" role="alert">{translate(errorKey)}</p>
            )}
        </section>
    );
}

export default AccountPrivacySection;
