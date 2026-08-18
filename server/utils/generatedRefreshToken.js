import jwt from 'jsonwebtoken'
import UserModel from "../models/user.model.js"
import { PERSISTENT_SESSION_REFRESH_TOKEN_TTL } from './authSession.js'

const genertedRefreshToken = async(userId)=>{
    const token = await jwt.sign({ _id : userId},  // Changing 'id' to '_id' for consistency
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn : PERSISTENT_SESSION_REFRESH_TOKEN_TTL }
    )

    // Preserve the token being replaced (with a rotation timestamp) so a
    // second tab/device that already had this same token in flight can
    // still use it briefly — see REFRESH_TOKEN_GRACE_WINDOW_MS.
    const currentUser = await UserModel.findById(userId).select('refresh_token')

    const updateRefreshTokenUser = await UserModel.updateOne(
        { _id : userId},
        {
            refresh_token : token,
            previous_refresh_token : currentUser?.refresh_token || '',
            previous_refresh_token_rotated_at : currentUser?.refresh_token ? new Date() : null
        }
    )

    return token
}

export default genertedRefreshToken