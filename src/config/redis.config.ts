import Redis from 'ioredis';
import RedisService from '../services/redis.service.js';
import { logErrorLoki } from '../utils/lokiConfig.js';
import { REDIS_CONNECTION_HOST, REDIS_CONNECTION_PORT } from '../constants/env.constant.js';

const redisClient = new Redis.Cluster(
  [{ host: REDIS_CONNECTION_HOST, port: parseInt(REDIS_CONNECTION_PORT) }],
  {
    dnsLookup: (address, callback) => callback(null, address),
    redisOptions: {
      tls: {},
    },
  },
);
redisClient.on('error', err => logErrorLoki(`Error connecting redis ${err}`, true));
redisClient.on('connect', () => logErrorLoki(`Redis Connected Successfully`, false));

const redisService = new RedisService(redisClient);
export default redisService;
