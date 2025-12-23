import LokiTransport from 'winston-loki';
import { createLogger, transports } from 'winston';
import NepaliDate from 'nepali-datetime';
import { LOKI_BASIC_AUTH, LOKI_HOST } from '../constants/env.constant.js';

const options = {
  transports: [
    new LokiTransport({
      host: LOKI_HOST,
      basicAuth: LOKI_BASIC_AUTH, // This is user:password (API key)
      labels: { job: 'nodejs-app' },
      json: true,
      interval: 5, // batch send logs every 5 seconds
    }),
  ],
};

const logger = createLogger(options);

export function logErrorLoki(log: string, isError: boolean = true) {
  const now = new NepaliDate();
  const formattedDateTime = `${now.format('YYYY-MM-DD')} | ${now.format('hh:mm A')}`;
  isError
    ? logger.error(`Time: ${formattedDateTime} | ${log}`)
    : logger.info(`Time: ${formattedDateTime} | ${log}`);
}
