import vision from '@google-cloud/vision';

const visionClient = new vision.ImageAnnotatorClient();

type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY'
  | null
  | undefined;

interface SafeSearchAnnotation {
  adult?: Likelihood;
  violence?: Likelihood;
  racy?: Likelihood;
}

const REJECTED_LIKELIHOODS = new Set(['LIKELY', 'VERY_LIKELY']);

/** Pure so the threshold policy can be unit-tested without calling the Vision API. */
export function isRejectedBySafeSearch(
  annotation: SafeSearchAnnotation | null | undefined,
): boolean {
  if (!annotation) {
    return false;
  }
  return [annotation.adult, annotation.violence, annotation.racy].some(
    likelihood => likelihood && REJECTED_LIKELIHOODS.has(likelihood),
  );
}

/** 7.2 — runs Google Cloud Vision SafeSearch against an image already sitting in Cloud Storage. */
export async function isImageSafe(gcsUri: string): Promise<boolean> {
  const [result] = await visionClient.safeSearchDetection(gcsUri);
  return !isRejectedBySafeSearch(
    result.safeSearchAnnotation as SafeSearchAnnotation | null | undefined,
  );
}
