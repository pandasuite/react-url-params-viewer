type DeeplinkPreviewProps = {
  deeplink: string;
};

export default function DeeplinkPreview({ deeplink }: DeeplinkPreviewProps) {
  return (
    <div className="deeplink-preview">
      <code>{deeplink}</code>
    </div>
  );
}
