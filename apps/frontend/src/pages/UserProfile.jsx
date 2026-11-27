import { useEffect, useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import FollowListModal from "../components/FollowListModal.jsx";
import {
    fetchUserProfile,
    followUser,
    getProfileInitials,
    unfollowUser
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
    const [counts, setCounts] = useState({ followers: 0, following: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [errorKey, setErrorKey] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
    const [openList, setOpenList] = useState(null);

    useEffect(() => {
        let isActive = true;
        const controller = new AbortController();

        fetchUserProfile(userId, { signal: controller.signal })
            .then((data) => {
                if (!isActive) {
                    return;
                }
                setProfile(data.user);
                setIsFollowing(data.isFollowing);
                setCounts(data.counts || { followers: 0, following: 0 });
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
            await followUser(userId);
            setIsFollowing(true);
            setCounts((prev) => ({ ...prev, followers: prev.followers + 1 }));
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
            setCounts((prev) => ({
                ...prev,
                followers: Math.max(0, prev.followers - 1)
            }));
            setShowUnfollowConfirm(false);
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
                        <button
                            type="button"
                            className="user-profile-message"
                            disabled
                            title={translate("follows.states.comingSoon")}
                        >
                            {translate("follows.messageSoon")}
                        </button>
                        {!isSelf && (
                            isFollowing ? (
                                <button
                                    type="button"
                                    className="user-profile-follow user-profile-follow--active"
                                    disabled={isUpdating}
                                    onClick={() => setShowUnfollowConfirm((value) => !value)}
                                >
                                    {translate("follows.following")}
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
                    </div>
                </div>

                <div className="user-profile-info">
                    <h1 className="user-profile-name">{displayName}</h1>
                    <p className="user-profile-handle">@{profile.username}</p>
                    <div className="user-profile-counts">
                        <button
                            type="button"
                            onClick={() => setOpenList("followers")}
                        >
                            {translate("follows.counts", {
                                followers: counts.followers,
                                following: counts.following
                            })}
                        </button>
                    </div>
                    {errorKey !== null && (
                        <p className="user-profile-error" role="alert">{translate(errorKey)}</p>
                    )}
                    {showUnfollowConfirm && (
                        <div className="user-profile-confirm">
                            <span>
                                {translate("follows.confirmUnfollow", { name: displayName })}
                            </span>
                            <button
                                type="button"
                                className="user-profile-follow"
                                disabled={isUpdating}
                                onClick={handleUnfollow}
                            >
                                {translate("follows.confirmAction")}
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
