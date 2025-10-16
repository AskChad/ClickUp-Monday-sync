import crypto from 'crypto';

/**
 * Generate a hash for file duplicate detection
 */
export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate a quick hash for comparison (MD5 for speed)
 */
export const generateQuickHash = (data: string | Buffer): string => {
  return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * Compare two hashes
 */
export const compareHashes = (hash1: string, hash2: string): boolean => {
  return hash1.toLowerCase() === hash2.toLowerCase();
};

/**
 * Generate a unique ID based on multiple fields
 */
export const generateCompositeId = (...fields: string[]): string => {
  const combined = fields.filter(Boolean).join('|');
  return generateQuickHash(combined);
};
