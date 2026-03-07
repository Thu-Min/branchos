import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { output, error, success } from '../../src/output/index.js';

describe('output', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('output()', () => {
    it('should print valid JSON when json option is true', () => {
      const data = { key: 'value', count: 42 };
      output(data, { json: true });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const printed = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(printed);
      expect(parsed.key).toBe('value');
      expect(parsed.count).toBe(42);
    });

    it('should print human-readable text when json option is false', () => {
      const data = { key: 'value' };
      output(data, { json: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const printed = consoleLogSpy.mock.calls.map(c => c[0]).join('\n');
      expect(printed.length).toBeGreaterThan(0);
      expect(printed).toContain('key');
      expect(printed).toContain('value');
    });
  });

  describe('error()', () => {
    it('should print JSON error when json option is true', () => {
      error('something went wrong', { json: true });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const printed = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(printed);
      expect(parsed.error).toBe('something went wrong');
    });

    it('should print colored error when json option is false', () => {
      error('something went wrong', { json: false });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const printed = consoleErrorSpy.mock.calls[0][0];
      expect(printed).toContain('something went wrong');
    });
  });

  describe('success()', () => {
    it('should print JSON success when json option is true', () => {
      success('it worked', { json: true });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const printed = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(printed);
      expect(parsed.success).toBe(true);
      expect(parsed.message).toBe('it worked');
    });

    it('should print colored success when json option is false', () => {
      success('it worked', { json: false });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const printed = consoleLogSpy.mock.calls[0][0];
      expect(printed).toContain('it worked');
    });
  });
});
