const { Resend } = require("resend");

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(email, otp, ttlSeconds) {
  const from =
  (process.env.RESEND_FROM || "TheobroTect Security <onboarding@resend.dev>").trim();


  const { data, error } = await resend.emails.send({
    from,
    to: [email],
    subject: "Your One-Time Password (OTP)",
    text: `Your OTP is ${otp}. It expires in ${ttlSeconds} seconds.`,
  });

  if (error) {
    const msg = typeof error === "string" ? error : (error.message || "Resend error");
    const err = new Error(msg);
    err.details = error;
    throw err;
  }

  return data; 
}

module.exports = { sendOtpEmail };
