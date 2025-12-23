import ErrorService from '../services/error.service.js';

async function pushErrors() {
  try {
    await ErrorService.getInstance().pushErrorsToDB();
    process.exit(0);
  } catch (error) {
    console.error('Failed to push errors:', error);
    process.exit(1);
  }
}

pushErrors();
