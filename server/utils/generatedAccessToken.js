import jwt from 'jsonwebtoken'

const generatedAccessToken = async(userId)=>{
    const token = await jwt.sign({ _id : userId},
        process.env.SECRET_KEY_ACCESS_TOKEN,
        { expiresIn : '30m'} // Changed to 30 minutes for session timeout
    )

    return token
}

export default generatedAccessToken