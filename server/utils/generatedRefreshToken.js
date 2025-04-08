import jwt from 'jsonwebtoken'
import UserModel from "../models/user.model.js"

const genertedRefreshToken = async(userId)=>{
    const token = await jwt.sign({ _id : userId},  // Changing 'id' to '_id' for consistency
        process.env.SECRET_KEY_REFRESH_TOKEN,
        { expiresIn : '7d'}  // Keeping 7 days for refresh token
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