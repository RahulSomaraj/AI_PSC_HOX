import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;
    
    // In a real application, you would integrate with an email service like SendGrid, AWS SES, etc.
    // For now, we'll just log the reset link
    this.logger.log(`Password reset email for ${email}:`);
    this.logger.log(`Reset URL: ${resetUrl}`);
    
    // TODO: Implement actual email sending
    // Example with SendGrid:
    // const msg = {
    //   to: email,
    //   from: 'noreply@yourapp.com',
    //   subject: 'Password Reset Request',
    //   html: this.getPasswordResetEmailTemplate(resetUrl),
    // };
    // await sgMail.send(msg);
  }

  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You have requested to reset your password. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      </div>
    `;
  }
}

