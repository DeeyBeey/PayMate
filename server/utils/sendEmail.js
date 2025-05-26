import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (to, link) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Verify Your Email',
    html: `
      <p>Thanks for signing up to PayMate!</p>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${link}">Verify Email</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
