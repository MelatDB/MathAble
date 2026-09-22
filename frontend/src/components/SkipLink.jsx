/**
 * "Skip to main content" link.
 *
 * The very first focusable element on every screen. It is visually hidden
 * until it receives keyboard focus so sighted mouse users never see it but
 * keyboard / screen-reader users can jump straight past the navigation.
 */
export function SkipLink({ target = "main-content" }) {
  return (
    <a className="skip-link" href={`#${target}`}>
      Skip to main content
    </a>
  );
}
