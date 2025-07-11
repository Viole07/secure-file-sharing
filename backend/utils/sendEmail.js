const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: 587,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

module.exports = async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: 'noreply@securefiles.app',
    to,
    subject,
    text,
  });
};
