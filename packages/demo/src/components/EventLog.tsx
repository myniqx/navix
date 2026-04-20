/**
 * EventLog
 *
 * A read-only panel that displays the most recent navigation events.
 * Purely presentational — receives a list of pre-formatted strings and renders them.
 *
 * Props:
 *   entries — array of log strings, newest first. The first item is highlighted
 *             in accent color to indicate the latest event.
 */

interface EventLogProps {
  entries: string[];
}

export function EventLog({ entries }: EventLogProps) {
  return (
    <div
      style={{
        borderTop: '1px solid #1a1a2e',
        padding: '12px 32px',
        background: '#0d0d1a',
        minHeight: 80,
        maxHeight: 140,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#333',
          marginBottom: 6,
          letterSpacing: '0.1em',
        }}
      >
        EVENT LOG
      </div>
      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: '#333' }}>— no events yet —</div>
      )}
      {entries.map((entry, i) => (
        <div
          key={i}
          style={{
            fontSize: 12,
            // Newest entry is highlighted, older ones fade out
            color: i === 0 ? '#4fc3f7' : '#444',
            lineHeight: 1.6,
            fontFamily: 'monospace',
          }}
        >
          {entry}
        </div>
      ))}
    </div>
  );
}
