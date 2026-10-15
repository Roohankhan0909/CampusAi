import { fileUrl, formatSize } from "@/lib/coursework";
import type { FileRef } from "@/lib/types";

export default function FileLink({ file }: { file: FileRef }) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : "FILE";
  return (
    <a
      href={fileUrl(file)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs hover:border-indigo-400"
    >
      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-[#0a0a0a]">{ext.slice(0, 4)}</span>
      <span className="truncate font-medium text-slate-800">{file.name}</span>
      <span className="shrink-0 text-slate-500">{formatSize(file.size)}</span>
    </a>
  );
}
