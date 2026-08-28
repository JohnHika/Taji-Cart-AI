import crypto from 'crypto'

// A password-reset OTP is a security token, not just a display value —
// Math.random() is a predictable PRNG and isn't appropriate here.
const generatedOtp = ()=>{
    return crypto.randomInt(100000, 1000000)  /// 100000 to 999999
}
export default generatedOtp