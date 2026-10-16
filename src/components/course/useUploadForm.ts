"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { prepareUpload } from "@/app/actions/course";
import { MAX_UPLOAD_MB, fileTypeFor } from "@/lib/coursework";
import type { FormState } from "@/lib/types";

// Uploads the form's "file" input straight to storage, then submits the rest of the form with a signed "fileRef".
// The form is only cleared after a successful save, so a rejected file doesn't wipe what the user typed.
export function useUploadForm(dispatch: (fd: FormData) => void, state: FormState, scope: { course: string } | { assignmentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    fd.delete("file");
    setError(undefined);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`Files must be ${MAX_UPLOAD_MB} MB or smaller.`);
      if (!fileTypeFor(file.name)) return setError("That file type isn't allowed. Upload a PDF, Office document, image, text/code file, or zip.");
      setUploading(true);
      try {
        const { ticket, error } = await prepareUpload({ ...scope, name: file.name, size: file.size });
        if (!ticket) return setError(error ?? "Couldn't start the upload. Please try again.");
        const res = await fetch(ticket.url, { method: "PUT", headers: { "Content-Type": ticket.contentType, "x-upsert": "false" }, body: file });
        if (!res.ok) return setError("The upload failed. Please try again.");
        fd.set("fileRef", ticket.ref);
      } catch {
        return setError("The upload failed. Check your connection and try again.");
      } finally {
        setUploading(false);
      }
    }
    startTransition(() => dispatch(fd));
  }

  return { formRef, onSubmit, uploading, error };
}
