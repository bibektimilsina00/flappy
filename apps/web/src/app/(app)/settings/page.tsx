import { redirect } from "next/navigation";

// /settings -> the first tab. Dodo's return_url lands here with ?checkout=done;
// forward it to the billing tab so its poller sees it.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  redirect(params.checkout === "done" ? "/settings/billing?checkout=done" : "/settings/account");
}
