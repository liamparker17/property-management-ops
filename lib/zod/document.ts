import { z } from 'zod';

export const documentKindEnum = z.enum(['LEASE_AGREEMENT']);
export const documentUploadMetaSchema = z.object({ kind: documentKindEnum });
