import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractDetailFromHtml } from './detail';

const html = readFileSync(resolve(process.cwd(), 'test/fixtures/detail.html'), 'utf8');

describe('extractDetailFromHtml', () => {
  it('pulls the full description and skills', () => {
    const d = extractDetailFromHtml(html);
    expect(d.fullDescription).toContain('real-time analytics platform');
    expect(d.fullDescription).toContain('do not contact us off-platform');
    expect(d.skills).toEqual(['React', 'TypeScript', 'GraphQL']);
  });

  it('extracts from a schema.org JobPosting JSON-LD when the rendered block is absent', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Senior React Engineer',
      description:
        '<p>We need a <strong>React</strong> dev for a long-term contract. Please do not contact us off-platform.</p>',
      skills: ['React', 'TypeScript', 'GraphQL'],
    };
    const d = extractDetailFromHtml(
      `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script>` +
        `<meta property="og:description" content="short"></head><body><div>app shell</div></body></html>`,
    );
    expect(d.fullDescription).toContain('long-term contract');
    expect(d.fullDescription).not.toContain('<strong>'); // HTML stripped to text
    expect(d.skills).toEqual(['React', 'TypeScript', 'GraphQL']);
  });

  it('falls back to the og:description meta when no block is present', () => {
    const d = extractDetailFromHtml(
      '<html><head><meta property="og:description" content="Just the meta."></head><body></body></html>',
    );
    expect(d.fullDescription).toBe('Just the meta.');
    expect(d.skills).toEqual([]);
  });
});
