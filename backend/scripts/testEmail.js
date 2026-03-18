import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmail() {
  console.log('--- Email Configuration Test ---');
  console.log('Host:', process.env.EMAIL_HOST);
  console.log('Port:', process.env.EMAIL_PORT);
  console.log('User:', process.env.EMAIL_USER);
  console.log('Pass Length:', process.env.EMAIL_PASS?.length || 0);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true, // Show debug output
    logger: true // Log information to console
  });

  try {
    console.log('\nAttempting to verify transporter...');
    await transporter.verify();
    console.log('✅ SMTP Connection is valid!');

    console.log('\nAttempting to send test email...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self
      subject: 'Astrella SMTP Test',
      text: 'If you are reading this, your email configuration is working!',
      html: '<b>If you are reading this, your email configuration is working!</b>',
    });
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ Error occurred:', error);
  }
}

testEmail();
