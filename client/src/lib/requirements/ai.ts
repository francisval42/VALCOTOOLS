export async function complianceWash(note: string): Promise<string> {
  const response = await fetch("/api/ai/compliance-wash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });

  if (!response.ok) {
    throw new Error("Failed to perform compliance wash");
  }

  const data = await response.json();
  return data.note;
}

export async function aiEdit(note: string, instruction: string): Promise<string> {
  const response = await fetch("/api/ai/edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note, instruction }),
  });

  if (!response.ok) {
    throw new Error("Failed to perform AI edit");
  }

  const data = await response.json();
  return data.note;
}
