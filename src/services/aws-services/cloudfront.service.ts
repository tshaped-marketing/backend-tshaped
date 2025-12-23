import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import '@aws-sdk/crc64-nvme-crt';
import {
  CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_PRIVATE_KEY,
  CLOUDFRONT_URL,
} from '../../constants/env.constant.js';

export class CloudFrontService {
  private privateKey: string;
  private keyGroupId: string;
  private cloudfrontDomain: string;

  constructor() {
    // Read the private key file directly
    this.privateKey = CLOUDFRONT_PRIVATE_KEY;
    this.keyGroupId = CLOUDFRONT_KEY_PAIR_ID;
    this.cloudfrontDomain = CLOUDFRONT_URL;
  }

  getSignedUrl(key: string, isPublic: boolean = false): string {
    const resourceUrl = `${this.cloudfrontDomain}/${key}`;

    // Set expiration date based on access type
    const dateLessThan = new Date();
    if (isPublic) {
      // 100 years expiry for public files
      dateLessThan.setFullYear(dateLessThan.getFullYear() + 100);
    } else {
      // 1 day expiry for private files
      dateLessThan.setDate(dateLessThan.getDate() + 1);
    }

    return getSignedUrl({
      url: resourceUrl,
      keyPairId: this.keyGroupId, // Using the key group ID instead of key pair ID
      privateKey: this.privateKey,
      dateLessThan: dateLessThan.toISOString(),
    });
  }
}

export const cloudfrontService = new CloudFrontService();
