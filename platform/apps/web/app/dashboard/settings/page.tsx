import { SettingsNavigation } from "@/components/settings/settings-navigation";

export default function page() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <SettingsNavigation />
    </div>
  );
}
