import JobDetailClient from "./JobDetailClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function JobDetailPage() {
  return <JobDetailClient />;
}
