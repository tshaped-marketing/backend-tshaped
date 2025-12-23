import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const region = 'ap-southeast-2'; // Change if needed
const secretId = 't-shaped-secrets';

const client = new SecretsManagerClient({ region });

export const loadSecrets = async () => {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const { SecretString } = await client.send(command);

    const secrets = JSON.parse(SecretString ?? '{}')!;

    process.env.JWT_SECRET = secrets.JWT_SECRET;
    process.env.OTP_EMAIL = secrets.OTP_EMAIL;
    process.env.NODE_ENV = secrets.NODE_ENV
    process.env.FRONTEND_URL = secrets.FRONTEND_URL;
    process.env.STRIPE_WEBHOOK_SECRET = secrets.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = secrets.STRIPE_SECRET_KEY;
    process.env.REDIS_CONNECTION_HOST = secrets.REDIS_CONNECTION_HOST;
    process.env.REDIS_CONNECTION_PORT = secrets.REDIS_CONNECTION_PORT;
    process.env.S3_ACCESS_KEY_ID = secrets.S3_ACCESS_KEY_ID;
    process.env.S3_SECRET_KEY = secrets.S3_SECRET_KEY;
    process.env.SES_ACCESS_KEY_ID = secrets.SES_ACCESS_KEY_ID;
    process.env.SES_SECRET_KEY = secrets.SES_SECRET_KEY;
    process.env.S3_REGION = secrets.S3_REGION;
    process.env.S3_BUCKET = secrets.S3_BUCKET;
    process.env.CLOUDFRONT_URL = secrets.CLOUDFRONT_URL
    process.env.CLOUDFRONT_PRIVATE_KEY = secrets.CLOUDFRONT_PRIVATE_KEY;
    process.env.CLOUDFRONT_KEY_PAIR_ID = secrets.CLOUDFRONT_KEY_PAIR_ID;
    process.env.ADMIN_IDS = secrets.ADMIN_IDS;
    process.env.MICROSOFT_CLIENT_ID = secrets.MICROSOFT_CLIENT_ID;
    process.env.MICROSOFT_CLIENT_SECRET = secrets.MICROSOFT_CLIENT_SECRET
    process.env.MICROSOFT_AUTHORITY = secrets.MICROSOFT_AUTHORITY;
    process.env.API_KEY = secrets.API_KEY;
    process.env.LOKI_BASIC_AUTH = secrets.LOKI_BASIC_AUTH;
    process.env.LOKI_HOST = secrets.LOKI_HOST;

    return secrets;
  } catch (error) {
    console.error('Error retrieving secrets:', error);
    throw error;
  }
};

