import { Resend } from 'resend';
import dotenv from 'dotenv'
import { nawiriBrand } from '../utils/brand.js';
dotenv.config()

if(!process.env.RESEND_API){
    console.log("Provide RESEND_API in side the .env file")
}

const resend = new Resend(process.env.RESEND_API);
const emailFrom = process.env.EMAIL_FROM || `${nawiriBrand.companyName} <onboarding@resend.dev>`;
const replyTo = process.env.EMAIL_REPLY_TO || nawiriBrand.supportEmail;

const sendEmail = async({sendTo, subject, html })=>{
    try {
        const { data, error } = await resend.emails.send({
            from: emailFrom,
            to: sendTo,
            subject: subject,
            html: html,
            reply_to: replyTo,
        });

        if (error) {
            return console.error({ error });
        }

        return data
    } catch (error) {
        console.log(error)
    }
}

export default sendEmail

