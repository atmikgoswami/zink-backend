const nodemailer = require("nodemailer");

const emailUtil = async (options) =>{
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

    const message = {
        from: process.env.SMTP_USER, 
        to: options.email, 
        subject: options.subject, 
        text: options.text,
        html: options.html, 
    }
    
    await transporter.sendMail(message);
}

module.exports = emailUtil;