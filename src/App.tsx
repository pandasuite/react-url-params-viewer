import { PandaBridgeRoot } from 'pandasuite-bridge-react';
import ViewerScreen from './components/ViewerScreen';
import LauncherScreen from './components/LauncherScreen';

function InnerApp() {
  const mode = new URLSearchParams(window.location.search).get('mode');

  if (mode === 'launcher') {
    return <LauncherScreen />;
  }

  return <ViewerScreen />;
}

export default function App() {
  return (
    <PandaBridgeRoot>
      <InnerApp />
    </PandaBridgeRoot>
  );
}
