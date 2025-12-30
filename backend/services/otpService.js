const { prisma } = require('../config/database');
const transporter = require('../config/email');

class OTPService {
  /**
   * Generate a random 6-digit OTP
   */
  static generateOTP(length = 6) {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
  }

  /**
   * Store OTP in database with expiration
   */
  static async storeOTP(email, otp) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(process.env.OTP_EXPIRE_MINUTES || 10));

    try {
      // Delete any existing OTP for this email
      await prisma.otpVerification.deleteMany({
        where: { email },
      });

      // Insert new OTP using Prisma ORM
      await prisma.otpVerification.create({
        data: {
          email,
          otp,
          expiresAt,
        },
      });

      return true;
    } catch (error) {
      console.error('Error storing OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(email, otp) {
    try {
      // Use Prisma ORM to find valid OTP
      const otpRecord = await prisma.otpVerification.findFirst({
        where: {
          email,
          otp,
          expiresAt: {
            gt: new Date(), // expires_at > NOW()
          },
          isUsed: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRecord) {
        return { valid: false, message: 'Invalid or expired OTP' };
      }

      // Mark OTP as used
      await prisma.otpVerification.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          isUsed: true,
        },
      });

      return { valid: true, message: 'OTP verified successfully' };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Send OTP via email
   */
  static async sendOTPEmail(email, otp) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ScholarFlex <noreply@scholarflex.com>',
      to: email,
      subject: 'Your ScholarFlex Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ScholarFlex</h1>
            </div>
            <div class="content">
              <h2>Your Login OTP</h2>
              <p>Hello,</p>
              <p>You requested a login OTP for your ScholarFlex account. Use the code below to complete your login:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              
              <p>This OTP will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
              <p>If you didn't request this OTP, please ignore this email.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} ScholarFlex. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  static async cleanupExpiredOTPs() {
    try {
      // Delete expired or used OTPs using Prisma ORM
      await prisma.otpVerification.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isUsed: true },
          ],
        },
      });
    } catch (error) {
      console.error('Error cleaning up OTPs:', error);
    }
  }
}

module.exports = OTPService;

