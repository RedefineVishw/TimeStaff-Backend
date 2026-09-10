export function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Short, unguessable-enough suffix to break a slug collision without a loop
// of incrementing numbers (org-1, org-2, ...) that leaks how many orgs share
// a name.
export function randomSlugSuffix(): string {
    return Math.random().toString(36).slice(2, 7);
}
