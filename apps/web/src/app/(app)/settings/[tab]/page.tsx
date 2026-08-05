import { SettingsContent } from "@/features/account";

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  return <SettingsContent tab={tab} />;
}
