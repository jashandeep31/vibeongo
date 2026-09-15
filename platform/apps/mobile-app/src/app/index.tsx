import { useIsFocused } from 'expo-router';

import { WorkspacePage } from '@/components/workspace-page';

export default function HomeScreen() {
  const isFocused = useIsFocused();

  return isFocused ? <WorkspacePage /> : null;
}
