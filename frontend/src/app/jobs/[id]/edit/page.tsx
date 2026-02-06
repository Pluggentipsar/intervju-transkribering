import AudioEditorClient from "./AudioEditorClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function AudioEditorPage() {
  return <AudioEditorClient />;
}
