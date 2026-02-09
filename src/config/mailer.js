// const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT || 587),
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   family: 4,
//   connectionTimeout: 10000,
//   socketTimeout: 10000,
// });

// async function sendOtpEmail(email, otp, ttlSeconds) {
//   return transporter.sendMail({
//     from: `"TheobroTect Security" <${process.env.EMAIL_USER}>`,
//     to: email,
//     subject: "Your One-Time Password (OTP)",
//     text: `Your OTP is ${otp}. It expires in ${ttlSeconds} seconds.`,
//   });
// }

// module.exports = { transporter, sendOtpEmail };


const nodemailer = require("nodemailer");

const port = Number(process.env.EMAIL_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port,
  secure: port === 465, // ✅ 465 = true, 587 = false
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,                 // force IPv4
  connectionTimeout: 20000,  // ✅ longer timeouts
  socketTimeout: 20000,
});

// ✅ Add this once to know if SMTP can be reached
transporter.verify()
  .then(() => console.log("✅ SMTP ready (connected to Gmail)"))
  .catch((err) => console.error("❌ SMTP verify failed FULL:", err));

async function sendOtpEmail(email, otp, ttlSeconds) {
  const info = await transporter.sendMail({
    from: `"TheobroTect Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP is ${otp}. It expires in ${ttlSeconds} seconds.`,
  });

  return info;
}

module.exports = { transporter, sendOtpEmail };

