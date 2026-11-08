import { redirect } from "next/navigation";

export default function AdminLoginRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  params.set("redirect", "/admin");
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (k !== "redirect" && typeof v === "string") {
        params.set(k, v);
      }
    }
  }
  redirect(`/login?${params.toString()}`);
}
