import jwt from 'jsonwebtoken'
import UserModel from "../models/user.model.js"
import { MAX_ACTIVE_REFRESH_SESSIONS, PERSISTENT_SESSION_REFRESH_TOKEN_TTL, hashRefreshToken } from './authSession.js'

// presentedToken is the refresh token this call is rotating (undefined for a
// fresh login/OAuth sign-in, which always starts a brand-new session).
// Passing it lets us rotate only that one device/tab's session instead of
// clobbering every other concurrent session — see refresh_sessions on the
// user model and isValidRefreshToken in authSession.js.
const genertedRefreshToken = async(userId, presentedToken = null)=>{
    const signingSecret = process.env.SECRET_KEY_REFRESH_TOKEN || process.env.JWT_SECRET;
    if (!signingSecret) {
        throw new Error('Refresh token signing secret is not configured');
    }
    const token = await jwt.sign({ _id : userId},  // Changing 'id' to '_id' for consistency
        signingSecret,
        { expiresIn : PERSISTENT_SESSION_REFRESH_TOKEN_TTL }
    )

    // Preserve the token being replaced (with a rotation timestamp) so a
    // second tab/device that already had this same token in flight can
    // still use it briefly — see REFRESH_TOKEN_GRACE_WINDOW_MS.
    const currentUser = await UserModel.findById(userId).select('refresh_token refresh_sessions')

    const sessions = Array.isArray(currentUser?.refresh_sessions) ? [...currentUser.refresh_sessions] : []
    const presentedHash = presentedToken ? hashRefreshToken(presentedToken) : null
    const matchedIndex = presentedHash ? sessions.findIndex((session) => session.tokenHash === presentedHash) : -1

    const rotatedSession = {
        tokenHash : hashRefreshToken(token),
        previousTokenHash : presentedHash,
        rotatedAt : presentedHash ? new Date() : null,
        createdAt : new Date()
    }

    if (matchedIndex >= 0) {
        // Rotating an existing session in place — every other session entry
        // is left untouched.
        sessions[matchedIndex] = rotatedSession
    } else {
        // A brand-new session: a fresh login/OAuth sign-in, or a legacy
        // single-field session (issued before refresh_sessions existed)
        // upgrading itself into the array the first time it refreshes.
        sessions.push(rotatedSession)
    }

    // Bounded to the most recently active sessions — oldest is evicted.
    const boundedSessions = sessions.slice(-MAX_ACTIVE_REFRESH_SESSIONS)

    await UserModel.updateOne(
        { _id : userId},
        {
            // Legacy single-slot fields kept in sync with the most recently
            // issued token so any code path still reading them (or a session
            // issued right before this migration) keeps working.
            refresh_token : token,
            previous_refresh_token : currentUser?.refresh_token || '',
            previous_refresh_token_rotated_at : currentUser?.refresh_token ? new Date() : null,
            refresh_sessions : boundedSessions
        }
    )

    return token
}

export default genertedRefreshToken
