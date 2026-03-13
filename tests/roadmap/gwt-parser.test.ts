import { describe, it, expect } from 'vitest';
import {
  parseAcceptanceCriteria,
  formatGwtChecklist,
} from '../../src/roadmap/gwt-parser.js';

describe('parseAcceptanceCriteria', () => {
  it('returns empty results for empty string', () => {
    const result = parseAcceptanceCriteria('');
    expect(result).toEqual({ gwtBlocks: [], freeformItems: [] });
  });

  it('returns empty results when no AC heading exists', () => {
    const body = [
      '# Feature Description',
      '',
      'Some description text.',
      '',
      '## Notes',
      '- A note',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result).toEqual({ gwtBlocks: [], freeformItems: [] });
  });

  it('returns empty results for empty AC section', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '## Next Section',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result).toEqual({ gwtBlocks: [], freeformItems: [] });
  });

  it('parses a single complete GWT block', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a user is logged in',
      'When they click the dashboard link',
      'Then the dashboard page is displayed',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(1);
    expect(result.gwtBlocks[0].id).toBe('AC-1');
    expect(result.gwtBlocks[0].steps).toEqual([
      { keyword: 'Given', text: 'a user is logged in', wasAnd: false },
      { keyword: 'When', text: 'they click the dashboard link', wasAnd: false },
      { keyword: 'Then', text: 'the dashboard page is displayed', wasAnd: false },
    ]);
    expect(result.freeformItems).toEqual([]);
  });

  it('resolves And keyword to preceding keyword type', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a user is logged in',
      'When they submit the form',
      'Then the form is saved',
      'And the API call succeeds',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(1);
    expect(result.gwtBlocks[0].steps[3]).toEqual({
      keyword: 'Then',
      text: 'the API call succeeds',
      wasAnd: true,
    });
  });

  it('parses multiple GWT blocks', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given condition A',
      'When action A',
      'Then result A',
      '',
      '### AC-2',
      'Given condition B',
      'When action B',
      'Then result B',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(2);
    expect(result.gwtBlocks[0].id).toBe('AC-1');
    expect(result.gwtBlocks[1].id).toBe('AC-2');
  });

  it('parses freeform checklist items', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '- [ ] Some criterion',
      '- [ ] Another criterion',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toEqual([]);
    expect(result.freeformItems).toEqual([
      { text: 'Some criterion' },
      { text: 'Another criterion' },
    ]);
  });

  it('handles mixed mode: GWT blocks and freeform items coexist', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a user exists',
      'When they log in',
      'Then they see the home page',
      '',
      '- [ ] Performance under 200ms',
      '- [ ] Works on mobile',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(1);
    expect(result.gwtBlocks[0].id).toBe('AC-1');
    expect(result.freeformItems).toEqual([
      { text: 'Performance under 200ms' },
      { text: 'Works on mobile' },
    ]);
  });

  it('demotes incomplete GWT block (missing Then) to freeform', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a user exists',
      'When they click something',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toEqual([]);
    expect(result.freeformItems).toEqual([
      { text: 'Given a user exists' },
      { text: 'When they click something' },
    ]);
  });

  it('demotes block when And is first line (no preceding keyword)', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'And something without preceding keyword',
      'When they act',
      'Then result',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toEqual([]);
    expect(result.freeformItems.length).toBeGreaterThan(0);
  });

  it('ignores body content before AC heading', () => {
    const body = [
      '# Feature Title',
      '',
      'Some description with Given keyword that should be ignored.',
      '',
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a valid state',
      'When action occurs',
      'Then expected result',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(1);
    expect(result.gwtBlocks[0].id).toBe('AC-1');
  });

  it('ignores content after next ## heading', () => {
    const body = [
      '## Acceptance Criteria',
      '',
      '### AC-1',
      'Given a valid state',
      'When action occurs',
      'Then expected result',
      '',
      '## Implementation Notes',
      '',
      '### AC-2',
      'Given this should be ignored',
      'When ignored',
      'Then ignored',
    ].join('\n');

    const result = parseAcceptanceCriteria(body);
    expect(result.gwtBlocks).toHaveLength(1);
    expect(result.gwtBlocks[0].id).toBe('AC-1');
  });
});

describe('formatGwtChecklist', () => {
  it('renders GWT blocks as checklist', () => {
    const result = formatGwtChecklist({
      gwtBlocks: [
        {
          id: 'AC-1',
          steps: [
            { keyword: 'Given', text: 'a user is logged in', wasAnd: false },
            { keyword: 'When', text: 'they click submit', wasAnd: false },
            { keyword: 'Then', text: 'the form is saved', wasAnd: false },
          ],
        },
      ],
      freeformItems: [],
    });

    expect(result).toBe(
      [
        '## Acceptance Criteria',
        '',
        '- [ ] **AC-1**',
        '  - Given a user is logged in',
        '  - When they click submit',
        '  - Then the form is saved',
      ].join('\n')
    );
  });

  it('renders freeform items as checklist', () => {
    const result = formatGwtChecklist({
      gwtBlocks: [],
      freeformItems: [
        { text: 'Some criterion' },
        { text: 'Another criterion' },
      ],
    });

    expect(result).toBe(
      [
        '## Acceptance Criteria',
        '',
        '- [ ] Some criterion',
        '- [ ] Another criterion',
      ].join('\n')
    );
  });

  it('renders And lines preserving And keyword', () => {
    const result = formatGwtChecklist({
      gwtBlocks: [
        {
          id: 'AC-1',
          steps: [
            { keyword: 'Given', text: 'a user is logged in', wasAnd: false },
            { keyword: 'When', text: 'they submit the form', wasAnd: false },
            { keyword: 'Then', text: 'the form is saved', wasAnd: false },
            { keyword: 'Then', text: 'the API call succeeds', wasAnd: true },
          ],
        },
      ],
      freeformItems: [],
    });

    expect(result).toBe(
      [
        '## Acceptance Criteria',
        '',
        '- [ ] **AC-1**',
        '  - Given a user is logged in',
        '  - When they submit the form',
        '  - Then the form is saved',
        '  - And the API call succeeds',
      ].join('\n')
    );
  });

  it('renders mixed GWT blocks and freeform items', () => {
    const result = formatGwtChecklist({
      gwtBlocks: [
        {
          id: 'AC-1',
          steps: [
            { keyword: 'Given', text: 'condition', wasAnd: false },
            { keyword: 'When', text: 'action', wasAnd: false },
            { keyword: 'Then', text: 'result', wasAnd: false },
          ],
        },
      ],
      freeformItems: [{ text: 'Performance check' }],
    });

    expect(result).toContain('- [ ] **AC-1**');
    expect(result).toContain('- [ ] Performance check');
  });
});
