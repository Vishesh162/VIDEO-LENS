export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <svg className="m-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 16 16 4M4 4h12v12" stroke="currentColor" strokeWidth="1.5" /></svg>
  ) : (
    <svg className="m-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path className="m-arrow__stem" d="M3 10h13" stroke="currentColor" strokeWidth="1.5" /><path className="m-arrow__head" d="m11 4 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>
  );
}
