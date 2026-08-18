import { z } from 'zod';
import { ValidationException } from '../../../../core/exceptions/app.exception';

// PDF Validator
export const PdfInputSchema = z.object({
  mimeType: z.literal('application/pdf'),
  size: z.number().max(50 * 1024 * 1024, 'PDF file must not exceed 50MB'), // 50MB
  buffer: z.any(), // File buffer
});

// YouTube Validator
export const YoutubeInputSchema = z.object({
  url: z.string().url(),
}).refine((data) => {
  const ytRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
  return ytRegex.test(data.url);
}, {
  message: "Must be a valid YouTube URL",
  path: ["url"]
});

export class ResourceValidator {
  static async validatePdf(input: any): Promise<void> {
    const result = PdfInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationException('Invalid PDF Input', result.error.errors);
    }
  }

  static async validateYoutube(input: any): Promise<void> {
    const result = YoutubeInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationException('Invalid YouTube Input', result.error.errors);
    }
  }
}
