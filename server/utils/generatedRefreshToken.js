import jwt from 'jsonwebtoken'
import UserModel from "../models/user.model.js"
import { PERSISTENT_SESSION_REFRESH_TOKEN_TTL } from './authSession.js'

const genertedRefreshToken = async(userId)=>{
    const token = await jwt.sign({ _id : userId},  // Changing 'id' to '_id' for consistency
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn : PERSISTENT_SESSION_REFRESH_TOKEN_TTL }
    )

    const updateRefreshTokenUser = await UserModel.updateOne(
        { _id : userId},
        {
            refresh_token : token
        }
    )

    return token
}

export default genertedRefreshToken