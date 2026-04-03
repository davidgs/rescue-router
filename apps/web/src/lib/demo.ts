import { demoReadOnlyViewerEmail } from "@rescue-router/shared";

export function isDemoViewerSession(email: string | undefined): boolean {
  return (
    !!email &&
    email.toLowerCase() === demoReadOnlyViewerEmail.toLowerCase()
  );
}

export async function enterReadOnlyDemo(): Promise<void> {
  const res = await fetch("/api/demo/enter", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}
