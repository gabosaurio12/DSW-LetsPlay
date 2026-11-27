/**
 * Builds the User filter that keeps public accounts, the viewer's own account
 * and accounts the viewer follows. Anonymous visitors only see public accounts.
 *
 * @param {string|null|undefined} viewerId - Current account UUID.
 * @returns {object} Prisma where fragment to spread into a User filter.
 */
function buildVisibleAccountFilter(viewerId) {
    if (!viewerId) {
        return { is_private: false };
    }

    return {
        OR: [
            { is_private: false },
            { id_user: viewerId },
            { Follows_Follows_id_followedToUser: { some: { id_follower: viewerId } } }
        ]
    };
}

/**
 * Builds the User filter that excludes accounts that blocked the viewer or that
 * the viewer blocked, in either direction.
 *
 * @param {string|null|undefined} viewerId - Current account UUID.
 * @returns {object} Prisma where fragment to spread into a User filter.
 */
function buildNotBlockedFilter(viewerId) {
    if (!viewerId) {
        return {};
    }

    return {
        Blocks_Blocks_id_blockerToUser: { none: { id_blocked: viewerId } },
        Blocks_Blocks_id_blockedToUser: { none: { id_blocker: viewerId } }
    };
}

/**
 * Builds the Post filter that keeps posts outside communities or inside public communities.
 *
 * @returns {Array<object>} Prisma OR conditions for a Post filter.
 */
function buildPublicCommunityConditions() {
    return [
        { id_community: null },
        { Communities: { status: "ACTIVE", type: "PUBLIC" } }
    ];
}

module.exports = {
    buildVisibleAccountFilter,
    buildNotBlockedFilter,
    buildPublicCommunityConditions
};
