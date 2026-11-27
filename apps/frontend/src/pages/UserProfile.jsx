import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import FollowListModal from "../components/FollowListModal.jsx";
import {
    fetchUserProfile,
    fetchBlockState,
    followUser,
    blockUser,
    getProfileInitials,
    unfollowUser,
    unblockUser
} from "../services/followService.js";
import "./UserProfile.css";

const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;

/**
 * Public profile of another account, including follow actions and connections.
 *
 * @param {Object} props - Component props.
 * @param {string} props.userId - Account uuid to display.
 * @param {string} props.language - Current application language code.
 * @param {string} props.currentUserId - Signed-in account uuid.
 * @param {() => void} props.onBack - Returns to the previous view.
 * @param {(userId: string) => void} props.onOpenProfile - Opens another profile.
 * @param {() => void} props.onSessionExpired - Handles an expired session.
 * @returns {JSX.Element} The rendered profile page.
 */
function UserProfile({
    userId,
    language,
    currentUserId,
    onBack,
    onOpenProfile,
    onSessionExpired
}) {
    const translate = useTranslation(language);
    const [profile, setProfile] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [connectionState, setConnectionState] = useState("none");
    const [isBlocked, setIsBlocked] = useState(false);
    const [isFollowedBy, setIsFollowedBy] = useState(false);
    const [counts, setCounts] = useState({ followers: 0, following: 0 });
    const [canViewConnections, setCanViewConnections] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [errorKey, setErrorKey] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [openList, setOpenList] = useState(null);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        Promise.all([
            fetchUserProfile(userId, { signal: controller.signal }),
            fetchBlockState(userId, { signal: controller.signal })
        ])
            .then(([data, blockState]) => {
                if (!isActive) {
                    return;
                }
                setProfile(data.user);
                setConnectionState(data.connectionState || "none");
                setIsFollowing(data.connectionState === "following");
                setIsFollowedBy(data.isFollowedBy);
                setIsBlocked(blockState.isBlocked);
                setCounts(data.counts || { followers: 0, following: 0 });
                setCanViewConnections(data.canViewConnections !== false);
                setIsLoading(false);
            })
            .catch((error) => {
                if (!isActive || error.name === "AbortError") {
                    return;
                }
                if (error.status === UNAUTHORIZED_STATUS) {
                    onSessionExpired();
                    return;
                }
                setErrorKey(error.status === NOT_FOUND_STATUS
                    ? "follows.states.unavailable"
                    : "follows.errors.load");
                setIsLoading(false);
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [userId, onSessionExpired]);

    async function handleFollow() {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            const result = await followUser(userId);
            setConnectionState(result.connectionState);
            setIsFollowing(result.connectionState === "following");
            if (result.connectionState === "following") {
                setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (error) {
            handleFollowError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    async function handleUnfollow() {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            await unfollowUser(userId);
            setIsFollowing(false);
            const wasFollowing = connectionState === "following";
            setConnectionState("none");
            if (wasFollowing) {
                setCounts((prev) => ({
                    ...prev,
                    followers: Math.max(0, prev.followers - 1)
                }));
            }
            setShowUnfollowConfirm(false);
        } catch (error) {
            handleFollowError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    async function confirmBlockToggle() {
        setIsUpdating(true);
        setErrorKey(null);
        try {
            if (isBlocked) {
                await unblockUser(userId);
                setIsBlocked(false);
            } else {
                await blockUser(userId);
                setIsBlocked(true);
                setIsFollowing(false);
                setConnectionState("none");
                setCounts((previous) => {
                    const next = { ...previous };
                    if (isFollowing) {
                        next.followers = Math.max(0, next.followers - 1);
                    }
                    if (isFollowedBy) {
                        next.following = Math.max(0, next.following - 1);
                    }
                    return next;
                });
            }
            setShowBlockConfirm(false);
        } catch (error) {
            handleFollowError(error);
        } finally {
            setIsUpdating(false);
        }
    }

    function handleFollowError(error) {
        if (error.status === UNAUTHORIZED_STATUS) {
            onSessionExpired();
            return;
        }
        setErrorKey("follows.errors.update");
    }

    if (isLoading) {
        return (
            <section className="user-profile">
                <p className="user-profile-state">{translate("follows.states.loading")}</p>
            </section>
        );
    }

    if (profile === null) {
        return (
            <section className="user-profile">
                <p className="user-profile-state" role="alert">{translate(errorKey)}</p>
                <button type="button" className="user-profile-back" onClick={onBack}>
                    {translate("follows.backToLfg")}
                </button>
            </section>
        );
    }

    const displayName = profile.display_name || profile.username;
    const isSelf = profile.id_user === currentUserId;

    return (
        <section className="user-profile">
            <button type="button" className="user-profile-back" onClick={onBack}>
                ← {translate("follows.backToLfg")}
            </button>

            <article className="user-profile-card">
                <div className="user-profile-cover" aria-hidden="true" />
                <div className="user-profile-heading">
                    <div className="user-profile-avatar" aria-hidden="true">
                        {getProfileInitials(displayName)}
                    </div>
                    <div className="user-profile-actions">
                        {!isSelf && (
                            <button
                                type="button"
                                className="user-profile-block"
                                disabled={isUpdating}
                                onClick={() => setShowBlockConfirm((value) => !value)}
                            >
                                {translate(isBlocked ? "privacy.unblock" : "privacy.block")}
                            </button>
                        )}
                        {!isSelf && (
                            isFollowing || connectionState === "pending" ? (
                                <button
                                    type="button"
                                    className="user-profile-follow user-profile-follow--active"
                                    disabled={isUpdating}
                                    onClick={() => setShowUnfollowConfirm((value) => !value)}
                                >
                                    {translate(connectionState === "pending"
                                        ? "follows.requested"
                                        : "follows.following")}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="user-profile-follow"
                                    disabled={isUpdating}
                                    onClick={handleFollow}
                                >
                                    {translate("follows.follow")}
                                </button>
                            )
                        )}
                        <button
                            type="button"
                            className="user-profile-message"
                            disabled
                            title={translate("follows.states.comingSoon")}
                        >
                            {translate("follows.messageSoon")}
                        </button>
                    </div>
                </div>

                <div className="user-profile-info">
                    <h1 className="user-profile-name">{displayName}</h1>
                    <p className="user-profile-handle">@{profile.username}</p>
                    {profile.is_private && connectionState !== "following" && (
                        <p className="user-profile-private-label">
                            {translate("privacy.privateProfile")}
                        </p>
                    )}
                    <div className="user-profile-counts">
                        {canViewConnections ? (
                            <button
                                type="button"
                                onClick={() => setOpenList("followers")}
                            >
                                {translate("follows.counts", {
                                    followers: counts.followers,
                                    following: counts.following
                                })}
                            </button>
                        ) : (
                            <span className="user-profile-private-counts">
                                {translate("privacy.connectionsPrivate")}
                            </span>
                        )}
                    </div>
                    {errorKey !== null && (
                        <p className="user-profile-error" role="alert">{translate(errorKey)}</p>
                    )}
                    {showUnfollowConfirm && (
                        <div className="user-profile-confirm">
                            <span>
                                {translate(
                                    connectionState === "pending"
                                        ? "follows.confirmCancelRequest"
                                        : "follows.confirmUnfollow",
                                    { name: displayName }
                                )}
                            </span>
                            <button
                                type="button"
                                className="user-profile-follow"
                                disabled={isUpdating}
                                onClick={handleUnfollow}
                            >
                                {translate(connectionState === "pending"
                                    ? "follows.cancelRequest"
                                    : "follows.confirmAction")}
                            </button>
                            <button
                                type="button"
                                className="user-profile-cancel"
                                disabled={isUpdating}
                                onClick={() => setShowUnfollowConfirm(false)}
                            >
                                {translate("follows.confirmCancel")}
                            </button>
                        </div>
                    )}
                    {showBlockConfirm && (
                        <div className="user-profile-confirm">
                            <span>
                                {translate(
                                    isBlocked ? "privacy.confirmUnblock" : "privacy.confirmBlock",
                                    { name: displayName }
                                )}
                            </span>
                            <button
                                type="button"
                                className="user-profile-block"
                                disabled={isUpdating}
                                onClick={confirmBlockToggle}
                            >
                                {translate(isBlocked ? "privacy.unblock" : "privacy.block")}
                            </button>
                            <button
                                type="button"
                                className="user-profile-cancel"
                                disabled={isUpdating}
                                onClick={() => setShowBlockConfirm(false)}
                            >
                                {translate("follows.confirmCancel")}
                            </button>
                        </div>
                    )}
                </div>

                <div className="user-profile-tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={false} disabled
                        title={translate("follows.states.comingSoon")}>
                        {translate("follows.postsTab")}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={true}
                        className="user-profile-tab--active"
                    >
                        {translate("follows.aboutTab")}
                    </button>
                </div>

                <p className="user-profile-bio">
                    {profile.description
                        ? profile.description
                        : translate("follows.noBio")}
                </p>
            </article>

            {openList !== null && (
                <FollowListModal
                    userId={userId}
                    displayName={displayName}
                    currentUserId={currentUserId}
                    counts={counts}
                    translate={translate}
                    onClose={() => setOpenList(null)}
                    onOpenProfile={(nextId) => {
                        setOpenList(null);
                        onOpenProfile(nextId);
                    }}
                    onSessionExpired={onSessionExpired}
                    onUnfollow={() => setCounts((prev) => ({
                        ...prev,
                        followers: Math.max(0, prev.followers - 1)
                    }))}
                />
            )}
        </section>
    );
}

export default UserProfile;
