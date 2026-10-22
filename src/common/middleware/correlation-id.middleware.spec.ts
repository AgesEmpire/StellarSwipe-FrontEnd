import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  function createContext(headers: Record<string, string> = {}) {
    const req: any = { headers: { ...headers } };
    const res: any = {
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
      },
    };
    const next = jest.fn();
    return { req, res, next };
  }

  it('preserves a valid incoming correlation id', () => {
    const { req, res, next } = createContext({ 'x-correlation-id': 'abc-123_XYZ.9' });

    middleware.use(req, res, next);

    expect(req.correlationId).toBe('abc-123_XYZ.9');
    expect(res.headers['x-correlation-id']).toBe('abc-123_XYZ.9');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a correlation id when the header is missing', () => {
    const { req, res, next } = createContext();

    middleware.use(req, res, next);

    expect(typeof req.correlationId).toBe('string');
    expect(req.correlationId.length).toBeGreaterThan(0);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces a malformed correlation id with a generated one', () => {
    const malformed = 'bad id with spaces!';
    const { req, res, next } = createContext({ 'x-correlation-id': malformed });

    middleware.use(req, res, next);

    expect(req.correlationId).not.toBe(malformed);
    expect(req.correlationId).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces an overlong correlation id with a generated one', () => {
    const overlong = 'a'.repeat(200);
    const { req, res, next } = createContext({ 'x-correlation-id': overlong });

    middleware.use(req, res, next);

    expect(req.correlationId).not.toBe(overlong);
    expect(res.headers['x-correlation-id']).toBe(req.correlationId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
