// Custom 404 page for static export
// This handles routes that weren't pre-generated (like dynamic entity routes)
// It renders the main Page component which handles routing client-side
import Page from "./page"

export default function NotFound() {
  // Render the main page - client-side router will handle the actual routing
  // This allows dynamic routes like /entities/test to work even if not pre-generated
  return <Page />
}

