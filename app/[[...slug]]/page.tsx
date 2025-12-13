// Optional catch-all route for all paths including root
// This handles paths like /, /setup, /entities/students, etc.
// Note: This must be a server component to use generateStaticParams()
// The MainPage component it renders is already a client component
import MainPage from "@/components/main-page"

// For static export, Next.js requires all routes to be pre-generated
// Since entity names are dynamic, we can't generate them all at build time
// Workaround: We generate a catch-all page that handles all routing client-side
// The issue is that Next.js will complain about missing routes during build,
// but the client-side router will handle them correctly at runtime
export function generateStaticParams() {
  // Return base routes that are always accessible
  // Include empty array for root path (/)
  // For dynamic entity routes like /entities/test, we can't pre-generate them
  // The client-side router will parse the actual entity name from window.location.pathname
  return [
    { slug: [] }, // Root path
    { slug: ['setup'] },
    { slug: ['login'] },
    { slug: ['entities'] },
    { slug: ['logs'] },
    { slug: ['admins'] },
    { slug: ['settings'] },
  ]
}

// Note: With static export, Next.js will complain about routes not in generateStaticParams
// However, since we're using client-side routing, this is expected and acceptable
// The Page component will handle all routing based on window.location.pathname
export default function CatchAllPage({
  params,
}: {
  params: { slug?: string[] }
  // Explicitly don't use searchParams to avoid serialization issues with static export
}) {
  // Always render the main page - client-side router handles the actual routing
  // The MainPage component parses window.location.pathname and renders the appropriate view
  // This works for both pre-generated routes and dynamic routes like /entities/test
  // Params are optional for the optional catch-all route
  // We don't use searchParams here - the client-side router handles query params
  return <MainPage />
}

