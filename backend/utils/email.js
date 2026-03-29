/**
 * [SECTION] EMAIL UTILITIES
 * [INFO] Core service for sending transactional emails (Password Resets, Notifications).
 * [FLOW] Uses Nodemailer with configurable SMTP transport.
 */
import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  // [LOGIC] Check for missing environment variables
  const requiredEnv = ['EMAIL_USER', 'EMAIL_PASS', 'EMAIL_HOST', 'EMAIL_PORT'];
  const missing = requiredEnv.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[Email System] WARNING: Missing environment variables: ${missing.join(', ')}`);
    console.warn(`[Email System] Email will not be sent to: ${options.email}`);
    console.warn(`[Email System] Please configure these in your .env file to enable password resets and notifications.`);
    return; // [FLOW] Gracefully skip sending to prevent app crash
  }

  // [LOGIC] Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // [DEBUG] Log masked credentials for verification
  console.log(`[Email System] DEBUG: Sending via ${process.env.EMAIL_HOST} as ${process.env.EMAIL_USER.replace(/(.{3}).*@/, '$1***@')}`);

  // [LOGIC] Define email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Astrella <noreply@astrella.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  try {
    // [FLOW] Trigger actual SMTP delivery
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email System] SUCCESS: Email sent to ${options.email} (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error(`[Email System] ERROR: Failed to send email to ${options.email}:`, error.message);
  }
};

export default sendEmail;
