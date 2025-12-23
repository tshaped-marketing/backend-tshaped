import transporter from '../../config/email.config.js';

interface EmailOptions {
  to: string;
  subject: string;
  htmlTemplate: any;
  from?: string;
  text?: string;
}

async function sendEmail({
  to,
  subject,
  htmlTemplate,
  from = '"T-Shaped Marketing" <noreply@t-shapedmarketing.com>',
  text,
}: EmailOptions): Promise<string> {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlTemplate,
      // Only include text if provided
      ...(text && { text }),
    });


    return info.messageId;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Example usage:
//  sendEmail({
//   to: 'insa@gxdrop.com',
//   subject: 'Account Verification',
//   htmlTemplate: htmlTemplate("133456"),
//   text: 'Your verification code is: 123456'
// });

export default sendEmail;
