const MAX_SLUG_LENGTH = 50;

/**
 * Convert a title to a URL-safe slug.
 * Lowercase, replace non-alphanumeric with hyphens, collapse, trim, cap at 50 chars.
 */
export function slugify(title: string): string {
  if (!title) return '';

  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-$/, '');
  }

  return slug;
}

/**
 * Generate a feature filename from id and title.
 * Format: `F-001-user-auth.md`
 */
export function featureFilename(id: string, title: string): string {
  return `${id}-${slugify(title)}.md`;
}

/**
 * Generate a feature branch name from title.
 * Format: `feature/user-auth`
 */
export function featureBranch(title: string): string {
  return `feature/${slugify(title)}`;
}
