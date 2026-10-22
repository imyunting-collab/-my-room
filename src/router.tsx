// Minimal hash router (works on GitHub Pages / any static host, and offline in the PWA).
import { useEffect, useState, type ReactNode } from 'react';

export function currentPath(): string {
  const h = location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}
export function navigate(to: string, replace = false) {
  const url = '#' + to;
  if (replace) history.replaceState(null, '', url); else location.hash = to;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}
export function back(fallback = '/') {
  if (history.length > 1) history.back(); else navigate(fallback);
}
export function usePath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const f = () => setPath(currentPath());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return path;
}
export function splitPath(path: string): { pathname: string; query: URLSearchParams } {
  const [p, q] = path.split('?');
  return { pathname: p || '/', query: new URLSearchParams(q || '') };
}
export function match(pattern: string, pathname: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean), b = pathname.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
export function Link(props: { to: string; className?: string; children?: ReactNode; title?: string; 'aria-label'?: string }) {
  return <a href={'#' + props.to} className={props.className} title={props.title} aria-label={props['aria-label']}>{props.children}</a>;
}
