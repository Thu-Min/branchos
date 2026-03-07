import { STRIP_PREFIXES, PROTECTED_BRANCHES } from '../constants.js';

export function slugifyBranch(branch: string): string {
  let slug = branch;

  // Strip first matching prefix (case-insensitive match)
  const lowerBranch = branch.toLowerCase();
  for (const prefix of STRIP_PREFIXES) {
    if (lowerBranch.startsWith(prefix.toLowerCase())) {
      slug = branch.slice(prefix.length);
      break;
    }
  }

  // Lowercase the result
  slug = slug.toLowerCase();

  // Replace non-alphanumeric chars (except hyphens and underscores) with hyphens
  slug = slug.replace(/[^a-z0-9_-]/g, '-');

  // Collapse multiple consecutive hyphens to single
  slug = slug.replace(/-{2,}/g, '-');

  // Trim leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
}

export function isProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCHES.includes(branch);
}
