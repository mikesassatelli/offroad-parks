/**
 * Google "G" logo mark, inline SVG (no network request) so sign-in buttons
 * look like a standard Google button in both light and dark mode.
 */
export function GoogleLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-1.8 14-5.1l-6.5-5.4C29.5 36.6 26.9 37.5 24 37.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.5 40.6 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.4C40.9 36.1 45 30.5 45 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
