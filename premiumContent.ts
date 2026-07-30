/**
 * Every outbound link in the app.
 *
 * Replace the two example.com URLs with your live pages before submitting to
 * App Review — Apple opens both from the paywall and rejects dead links.
 */
export const appLinks = {
  privacyPolicy: 'https://example.com/privacy',
  termsOfUse: 'https://example.com/terms',
  supportEmail: 'support@example.com',
} as const;

/** Pre-fills the support mail so people do not have to describe their build. */
export function buildSupportMailto(details: { version: string; build: string }) {
  const subject = encodeURIComponent('Cozy Masjid support');
  const body = encodeURIComponent(
    `\n\n---\nApp version: ${details.version} (${details.build})\nPlease describe what happened above this line.`,
  );
  return `mailto:${appLinks.supportEmail}?subject=${subject}&body=${body}`;
}
