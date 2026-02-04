import AudioEditorPage from "./EditPageClient";

// Allow pages with IDs not known at build time
export const dynamicParams = true;

// Return placeholder for static export - actual pages generated client-side
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function EditPage() {
  return <AudioEditorPage />;
}
