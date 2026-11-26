export function securityHeadersMiddleware(
  _req: unknown,
  res: { setHeader(name: string, value: string): void },
  next: () => void,
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
  );
  next();
}
