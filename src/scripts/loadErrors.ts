import ErrorService from '../services/error.service.js';

async function loadErrors() {
  try {
    await ErrorService.getInstance().loadErrorsFromDB();
    process.exit(0);
  } catch (error) {
    console.error('Failed to load errors:', error);
    process.exit(1);
  }
}

loadErrors();
