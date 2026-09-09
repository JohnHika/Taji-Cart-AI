import jwt from 'jsonwebtoken'

const generatedAccessToken = async(userId)=>{
    const signingSecret = process.env.SECRET_KEY_ACCESS_TOKEN || process.env.JWT_SECRET;
    if (!signingSecret) {
        throw new Error('Access token signing secret is not configured');
    }
    const token = await jwt.sign({ _id : userId},
        signingSecret,
        { expiresIn : '30m'} // Changed to 30 minutes for session timeout
    )

    return token
}

export default generatedAccessToken
