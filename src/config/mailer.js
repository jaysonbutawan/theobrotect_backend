const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

async function sendOtpEmail(email, otp, ttlSeconds) {
  return transporter.sendMail({
    from: `"TheobroTect Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP is ${otp}. It expires in ${ttlSeconds} seconds.`,
  });
}

module.exports = { transporter, sendOtpEmail };
