import { loadSecrets } from './config/secretManager.config.js';

(async () => {
  try {
    const shouldUseAwsSecrets =
      process.env.USE_AWS_SECRETS === 'true' || process.env.NODE_ENV === 'production';

    if (shouldUseAwsSecrets) {
      await loadSecrets();
      console.log('Secrets loaded successfully from AWS Secrets Manager');
    } else {
      console.log('Skipping AWS Secrets Manager. Using environment variables from .env');
    }

    const { startServer } = await import('./server.js');
    startServer();
  } catch (error) {
    console.error('Failed to initialize server.', error);
    process.exit(1);
  }
})();
