export async function fetchJarvis(endpoint: string) {
  const res = await fetch(`/api/jarvis/${endpoint}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch from Jarvis: ${res.statusText}`);
  }
  return res.json();
}
