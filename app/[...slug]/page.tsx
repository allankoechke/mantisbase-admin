// Catch-all route for all paths
// This handles paths like /setup, /entities/students, etc.
// The root / is handled by app/page.tsx, but this catches everything else
import Page from "../page"

// Required for static export - return all known routes
export function generateStaticParams() {
  // Return all known routes that might be accessed
  // For client-side routing, we generate these as static pages
  return [
    { slug: ['setup'] },
    { slug: ['login'] },
    { slug: ['entities'] },
    { slug: ['entities', 'students'] }, // Example entity route
    { slug: ['logs'] },
    { slug: ['admins'] },
    { slug: ['settings'] },
  ]
}

export default function CatchAllPage() {
  // Always render the main page - client-side router handles the actual routing
  return <Page />
}

