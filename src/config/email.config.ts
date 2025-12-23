import nodemailer from 'nodemailer';
import { logErrorLoki } from '../utils/lokiConfig.js';
import { SES_ACCESS_KEY_ID, SES_SECRET_KEY } from '../constants/env.constant.js';


const transporter = nodemailer.createTransport({
  host: 'email-smtp.ap-southeast-2.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: SES_ACCESS_KEY_ID,
    pass: SES_SECRET_KEY,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error('Email transporter verification failed:', error);
    logErrorLoki(`Email transporter verification failed, ${error}`, true);
  } else {
    logErrorLoki(`Email server connection verified and ready`, false);
    console.log('Email server connection verified and ready');
  }
});

export default transporter;
