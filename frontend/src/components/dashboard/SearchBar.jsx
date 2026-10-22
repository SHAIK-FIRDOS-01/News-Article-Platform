import React, { useRef, useEffect } from 'react';

/**
 * Editorial SearchBar Component.
 * Features:
 * - Debounced full-text search dispatch
 * - Global '/' hotkey focus and 'Escape' clear
 * - Real-time match count & origin indicator
 * - Swiss Modernist high-contrast styling
 *
 * @param {object} props
 * @param {string} props.query - Current search term
 * @param {(query: string) => void} props.onSearch - Search input handler
 * @param {() => void} props.onClear - Clear search handler
 * @param {number} [props.resultCount] - Number of matched articles
 * @param {boolean} [props.isLoading=false] - Searching state
 * @param {string} [props.origin] - Search cache/data origin
 */
export function SearchBar({
  query = '',
  onSearch,
  onClear,
  resultCount,
  isLoading = false,
  origin,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      // Focus on '/' when not in input or textarea
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (query) {
          onClear && onClear();
        } else {
          inputRef.current?.blur();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, onClear]);

  return (
    <div className="w-full flex flex-col gap-2 select-none">
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-500 font-mono text-sm">
          {isLoading ? (
            <svg
              className="animate-spin h-4 w-4 text-swiss-black"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 text-swiss-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          placeholder="SEARCH DISPATCHES BY KEYWORD, TOPIC, OR OUTLET... (PRESS '/' TO FOCUS)"
          className="w-full pl-11 pr-24 py-2.5 bg-swiss-white border-2 border-swiss-black text-xs font-mono font-bold uppercase tracking-wider text-swiss-black placeholder-neutral-400 focus:outline-none focus:bg-neutral-50 transition-colors"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={onClear}
              title="Clear search"
              className="px-2 py-1 bg-swiss-black text-swiss-white text-[10px] font-mono font-bold uppercase tracking-wider hover:bg-swiss-red transition-colors cursor-pointer"
            >
              CLEAR ✕
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 border border-neutral-300 bg-neutral-100 text-[10px] font-mono font-bold text-neutral-600 tracking-widest">
              /
            </kbd>
          )}
        </div>
      </div>

      {query && (
        <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-600 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-swiss-red inline-block" />
            <span>
              FILTERING FOR &quot;<span className="text-swiss-black underline">{query}</span>&quot;
              {typeof resultCount === 'number' && (
                <span className="ml-1 text-swiss-black">
                  · {resultCount} {resultCount === 1 ? 'DISPATCH FOUND' : 'DISPATCHES FOUND'}
                </span>
              )}
            </span>
          </div>

          {origin && (
            <span className="text-[10px] border border-neutral-300 px-1.5 py-0.5 bg-neutral-100 text-neutral-600">
              ORIGIN: {origin}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
