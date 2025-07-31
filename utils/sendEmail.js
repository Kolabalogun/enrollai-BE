// services/email.js
const transporter = require("../config/smtp");

require("dotenv").config();

const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
};

module.exports = sendEmail;
