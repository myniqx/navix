/**
 * PlaceholderView
 *
 * Generic placeholder shown for tabs that have no content yet
 * (Series, Live, Options). Not focusable — purely presentational.
 * The parent VerticalList will have no children when this is shown,
 * so up/down from the menu row finds nothing below and stays put.
 *
 * Props:
 *   label — tab name displayed in the message.
 */

interface PlaceholderViewProps {
  label: string;
}

export function PlaceholderView({ label }: PlaceholderViewProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 12,
      padding: '80px 32px',
      color: '#333',
    }}>
      <div style={{ fontSize: 48 }}>◻</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#444' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#333' }}>Content coming soon</div>
    </div>
  );
}
