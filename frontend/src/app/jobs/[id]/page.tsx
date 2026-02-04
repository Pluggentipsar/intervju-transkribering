import JobDetailClient from "./JobDetailClient";

// Allow pages with IDs not known at build time
export const dynamicParams = true;

// Return placeholder for static export - actual pages generated client-side
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function JobDetailPage() {
  return <JobDetailClient />;
}
