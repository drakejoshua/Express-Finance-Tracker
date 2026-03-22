import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

// initialize mailersend client
const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY
})

// function to send email using mailersend
export async function sendEmail( to, subject, html ) {
    const emailParams = new EmailParams()
        .setFrom( new Sender( "info@test.mlsender.net", "GreenFinance" ) )
        .setTo( new Recipient( to ) )
        .setSubject( subject )
        .setHtml( html )

    return mailerSend.email.send( emailParams )
}

export function sendVerificationEmail( to, token ) {
    const verificationLink = `${ process.env.FRONTEND_URL }/verify/email/${ token }`
    
    const html = `
        <p>Thank you for signing up for GreenFinance! Please click the link below to verify your email address:</p>
        <a href="${ verificationLink }">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
    `
    return sendEmail( to, "Verify your email address", html )
}