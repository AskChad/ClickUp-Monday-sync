import { generateFileHash, compareHashes } from '@/lib/utils/hash';
import type { ClickUpAttachment } from '@/types/clickup';
import type { MondayAsset } from '@/types/monday';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedAsset?: MondayAsset;
  reason?: string;
}

export class DuplicateChecker {
  /**
   * Check if a file already exists in Monday by comparing name and size
   */
  static checkByNameAndSize(
    attachment: ClickUpAttachment,
    existingAssets: MondayAsset[]
  ): DuplicateCheckResult {
    const match = existingAssets.find(
      asset =>
        asset.name.toLowerCase() === attachment.title.toLowerCase() &&
        asset.file_size === attachment.size
    );

    if (match) {
      return {
        isDuplicate: true,
        matchedAsset: match,
        reason: 'Name and size match',
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Check if a file already exists by comparing file hash
   */
  static async checkByHash(
    fileBuffer: Buffer,
    existingAssets: MondayAsset[]
  ): Promise<DuplicateCheckResult> {
    const newFileHash = generateFileHash(fileBuffer);

    // Note: Monday doesn't provide file hashes, so we'd need to store them separately
    // For now, this is a placeholder for future enhancement
    return { isDuplicate: false };
  }

  /**
   * Check if a file already exists using multiple strategies
   */
  static async check(
    attachment: ClickUpAttachment,
    existingAssets: MondayAsset[],
    fileBuffer?: Buffer
  ): Promise<DuplicateCheckResult> {
    // Strategy 1: Check by name and size (fast)
    const nameSizeCheck = this.checkByNameAndSize(attachment, existingAssets);
    if (nameSizeCheck.isDuplicate) {
      return nameSizeCheck;
    }

    // Strategy 2: Check by hash (if buffer provided)
    if (fileBuffer) {
      const hashCheck = await this.checkByHash(fileBuffer, existingAssets);
      if (hashCheck.isDuplicate) {
        return hashCheck;
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Check if file extension is allowed
   */
  static isAllowedFileType(filename: string, allowedExtensions?: string[]): boolean {
    if (!allowedExtensions || allowedExtensions.length === 0) {
      return true; // Allow all if no restrictions
    }

    const extension = filename.split('.').pop()?.toLowerCase();
    return allowedExtensions.includes(extension || '');
  }

  /**
   * Check if file size is within limits
   */
  static isWithinSizeLimit(fileSize: number, maxSizeBytes: number = 500 * 1024 * 1024): boolean {
    // Default 500MB limit
    return fileSize <= maxSizeBytes;
  }

  /**
   * Validate a file before upload
   */
  static validateFile(
    attachment: ClickUpAttachment,
    options?: {
      maxSizeBytes?: number;
      allowedExtensions?: string[];
    }
  ): { valid: boolean; error?: string } {
    // Check size
    if (!this.isWithinSizeLimit(attachment.size, options?.maxSizeBytes)) {
      return {
        valid: false,
        error: `File size ${attachment.size} exceeds maximum allowed size`,
      };
    }

    // Check extension
    if (!this.isAllowedFileType(attachment.title, options?.allowedExtensions)) {
      return {
        valid: false,
        error: `File type not allowed: ${attachment.extension}`,
      };
    }

    return { valid: true };
  }
}
