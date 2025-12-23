export const htmlTemplate = (otp: string, type: string, userEmail?: string) => {
  // Helper function to get the appropriate message based on type
  const getMessage = (type: string) => {
    switch (type) {
      case 'EMAIL:VERIFICATION':
        return 'Thank you for registering with T-Shaped. To complete your registration';
      case 'EMAIL:RESET_PASSWORD':
        return 'You have requested to reset your password. To proceed with the password reset';
      case 'EMAIL:PASSWORD_CHANGED':
        return 'Your password has been successfully changed';
      default: // for 2FA
        return 'For logging in using 2FA';
    }
  };

  // Helper function to get the call-to-action text
  const getActionText = (type: string) => {
    switch (type) {
      case 'EMAIL:VERIFICATION':
        return 'click the button below:';
      case 'EMAIL:RESET_PASSWORD':
        return 'please use the verification code below:';
      case 'EMAIL:PASSWORD_CHANGED':
        return 'No further action is required.';
      default: // for 2FA
        return 'please use the verification code below:';
    }
  };

  // Helper function to get expiry time text
  const getExpiryText = (type: string) => {
    switch (type) {
      case 'EMAIL:VERIFICATION':
        return 'This verification link will expire in 24 hours (1 day)';
      case 'EMAIL:RESET_PASSWORD':
        return 'This code will expire in 10 minutes';
      default: // for 2FA
        return 'This code will expire in 10 minutes';
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(102, 126, 234, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    .header h1 {
      color: white;
      font-size: 32px;
      font-weight: 700;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
      position: relative;
      z-index: 1;
    }
    
    .header .subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      margin-top: 8px;
      font-weight: 300;
      position: relative;
      z-index: 1;
    }
    
    .content {
      padding: 40px 30px;
      background: white;
    }
    
    .message {
      color: #4b5563;
      line-height: 1.7;
      margin-bottom: 30px;
      font-size: 16px;
    }
    
    .message p {
      margin-bottom: 15px;
    }
    
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
    }
    
    .verification-section {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 2px solid #e2e8f0;
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
      position: relative;
      overflow: hidden;
    }
    
    .verification-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #8b5cf6, #a855f7, #c084fc);
    }
    
    .verification-label {
      color: #6b7280;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
    }
    
    .verification-code {
      font-size: 36px;
      font-weight: 800;
      color: #8b5cf6;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #8b5cf6, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 15px 0;
      text-shadow: 0 2px 4px rgba(139, 92, 246, 0.3);
    }
    
    .verify-button {
      display: inline-block;
      background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
      color: white;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
      border: none;
      cursor: pointer;
      margin: 20px 0;
    }
    
    .verify-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
    }
    
    .verify-button:active {
      transform: translateY(0);
    }
    
    .expiry-info {
      background: #f9fafb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .expiry-info .warning-icon {
      font-size: 14px;
      margin-right: 6px;
    }
    
    .expiry-info p {
      color: #78716c;
      font-weight: 500;
      margin: 0;
      font-size: 14px;
    }
    
    .security-notice {
      background: #f9fafb;
      border-left: 4px solid #6b7280;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .security-notice .shield-icon {
      font-size: 14px;
      margin-right: 6px;
    }
    
    .security-notice p {
      color: #6b7280;
      font-weight: 400;
      margin: 0;
      font-size: 14px;
    }
    
    .footer {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 14px;
      margin: 8px 0;
      line-height: 1.5;
    }
    
    .footer .company-name {
      font-weight: 600;
      color: #8b5cf6;
    }
    
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
      margin: 30px 0;
      border-radius: 1px;
    }
    
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      
      .header {
        padding: 30px 20px;
      }
      
      .header h1 {
        font-size: 28px;
      }
      
      .content {
        padding: 30px 20px;
      }
      
      .verification-code {
        font-size: 30px;
        letter-spacing: 4px;
      }
      
      .verify-button {
        padding: 14px 28px;
        font-size: 16px;
      }
      
      .footer {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>T-Shaped Marketing</h1>
      <div class="subtitle">Secure Authentication</div>
    </div>
    
    <div class="content">
      <div class="greeting">Hello there!</div>
      
      <div class="message">
        <p>${getMessage(type)} ${getActionText(type)}</p>
      </div>
      
      <div class="verification-section">
        ${type === 'EMAIL:VERIFICATION' ? `
          <div class="verification-label">Email Verification</div>
          <a href="https://tshapedmarketing.com/verify-email?email=${encodeURIComponent(userEmail || '')}&otp=${otp}" class="verify-button">
            Verify Email
          </a>
        ` : `
          <div class="verification-label">Verification Code</div>
          <div class="verification-code">${otp}</div>
        `}
      </div>
      
      ${type !== 'EMAIL:PASSWORD_CHANGED' ? `
        <div class="expiry-info">
          <p><span class="warning-icon">⏰</span>${getExpiryText(type)}</p>
        </div>
      ` : ''}
      
      <div class="security-notice">
        <p><span class="shield-icon">🔒</span>If you didn't request this ${type === 'EMAIL:VERIFICATION' ? 'verification' : 'code'}, please ignore this email</p>
      </div>
      
      <div class="divider"></div>
    </div>
    
    <div class="footer">
      <p>This is an automated message, please do not reply.</p>
      <p>&copy; ${new Date().getFullYear()} <span class="company-name" href="https://tshapedmarketing.com">T-Shaped Marketing</span>. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
  return html;
};


export const contactEmailTemplate = (
  name: string,
  email: string,
  subject: string | null,
  message: string,
  priority: string | null,
) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 24px;
    }
    .content {
      background-color: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 8px 8px;
    }
    .contact-details {
      margin: 20px 0;
      padding: 15px;
      background-color: #f3f4f6;
      border-radius: 4px;
    }
    .detail-row {
      margin: 10px 0;
    }
    .detail-label {
      font-weight: bold;
      color: #4b5563;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: bold;
      color: white;
      background-color: ${priority === 'High' ? '#dc2626' : priority === 'Medium' ? '#f59e0b' : '#10b981'};
    }
    .message-content {
      margin-top: 20px;
      padding: 15px;
      background-color: #f9fafb;
      border-radius: 4px;
      color: #1f2937;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>New Contact Message</h1>
    </div>
    <div class="content">
      <div class="contact-details">
        <div class="detail-row">
          <span class="detail-label">From:</span> ${name} (${email})
        </div>
        <div class="detail-row">
          <span class="detail-label">Subject:</span> ${subject || 'N/A'}
        </div>
        ${
          priority
            ? `
        <div class="detail-row">
          <span class="detail-label">Priority:</span> 
          <span class="priority-badge">${priority}</span>
        </div>
        `
            : ''
        }
        <div class="detail-row">
          <span class="detail-label">Time:</span> ${new Date().toLocaleString()}
        </div>
      </div>
      <div class="message-content">
        ${message.replace(/\n/g, '<br>')}
      </div>
      <div class="footer">
        <p>This is an automated message from your contact form.</p>
        <p>&copy; ${new Date().getFullYear()} T-Shaped Marketing. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
  return html;
};