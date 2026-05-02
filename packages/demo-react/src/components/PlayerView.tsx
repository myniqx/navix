import { MultiLayer, VerticalList, HorizontalList, Button } from '@navix/react';
import type { MultiLayerPanelProps } from '@navix/react';
import { useState } from 'react';

import type { ContentItem } from '../data';

export interface PlayerState {
  channels: ContentItem[];
  current: ContentItem;
  paused: boolean;
}

interface PlayerViewProps {
  player: PlayerState;
  onClose: () => void;
  onNext: () => boolean;
  onPrev: () => boolean;
  onChannelSelect: (ch: ContentItem) => void;
  onTogglePause: () => void;
  showPlayIcon: boolean;
}

export function PlayerView({
  player,
  onClose,
  onNext,
  onPrev,
  onChannelSelect,
  onTogglePause,
  showPlayIcon,
}: PlayerViewProps) {
  return (
    <MultiLayer
      fKey="home-player"
      onExitRequest={onClose}
      onNext={onNext}
      onPrev={onPrev}
      onTogglePlay={onTogglePause}
      baseLayer={() => (
        <GradientVideo item={player.current} paused={player.paused} />
      )}
      zapBanner={() => <ZapBanner item={player.current} />}
      notification={() =>
        player.paused ? (
          <PlayPauseNotification paused={true} />
        ) : showPlayIcon ? (
          <PlayPauseNotification paused={false} />
        ) : null
      }
      left={(props: MultiLayerPanelProps) => <SidePanel {...props} />}
      right={(props: MultiLayerPanelProps) => (
        <ChannelListPanel
          {...props}
          channels={player.channels}
          current={player.current}
          onSelect={onChannelSelect}
        />
      )}
      up={(props: MultiLayerPanelProps) => (
        <NotificationsPanel {...props} current={player.current} />
      )}
      down={(props: MultiLayerPanelProps) => (
        <ControlsPanel
          {...props}
          paused={player.paused}
          onTogglePause={onTogglePause}
          onNext={onNext}
          onPrev={onPrev}
        />
      )}
      panelTimeout={4000}
      style={{ overflow: 'hidden' }}
    />
  );
}

function GradientVideo({
  item,
  paused,
}: {
  item: ContentItem;
  paused: boolean;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: paused
          ? item.color
          : `linear-gradient(135deg, ${item.color}, #000 60%, ${item.color}88)`,
        backgroundSize: '400% 400%',
        animation: paused ? 'none' : 'gradientShift 6s ease infinite',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div
        style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.15)',
          userSelect: 'none',
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>▶</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{item.title}</div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.6 }}>
          {item.year}
        </div>
      </div>
    </div>
  );
}

function ZapBanner({ item }: { item: ContentItem }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 48,
        left: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'rgba(0,0,0,0.75)',
        border: `1px solid ${item.color}`,
        borderRadius: 10,
        padding: '12px 20px',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: item.color,
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
          {item.year}
        </div>
      </div>
    </div>
  );
}

function PlayPauseNotification({ paused }: { paused: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: paused ? 'rgba(0,0,0,0.45)' : 'transparent',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)',
          border: '3px solid rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 52,
          color: '#fff',
          backdropFilter: 'blur(6px)',
        }}
      >
        {paused ? '⏸' : '▶'}
      </div>
    </div>
  );
}

const TRACK_OPTIONS = [
  { id: 'audio-tr', label: 'Türkçe', group: 'Audio' },
  { id: 'audio-en', label: 'English', group: 'Audio' },
  { id: 'audio-de', label: 'Deutsch', group: 'Audio' },
  { id: 'sub-off', label: 'Off', group: 'Subtitles' },
  { id: 'sub-tr', label: 'Türkçe', group: 'Subtitles' },
  { id: 'sub-en', label: 'English', group: 'Subtitles' },
];

function SidePanel({ fKey, onEvent, close, panelState }: MultiLayerPanelProps) {
  const [selected, setSelected] = useState('audio-tr');

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        background: 'rgba(10,10,20,0.95)',
        borderRight: '1px solid #1e1e3a',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        transform:
          panelState === 'open' ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#4fc3f7',
          marginBottom: 16,
          paddingLeft: 24,
          letterSpacing: '0.08em',
        }}
      >
        Audio & Subtitles
      </div>
      <VerticalList
        fKey={fKey}
        onEvent={onEvent}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {TRACK_OPTIONS.map((opt, i) => (
          <Button
            key={opt.id}
            fKey={`${fKey}-${opt.id}`}
            onClick={() => setSelected(opt.id)}
          >
            {({ focused }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 24px',
                  background: focused ? 'rgba(79,195,247,0.1)' : 'transparent',
                  borderLeft: focused
                    ? '2px solid #4fc3f7'
                    : '2px solid transparent',
                }}
              >
                {i === 0 || TRACK_OPTIONS[i - 1]?.group !== opt.group ? (
                  <div
                    style={{
                      position: 'absolute',
                      fontSize: 9,
                      color: '#444',
                      letterSpacing: '0.1em',
                      marginTop: -28,
                    }}
                  >
                    {opt.group.toUpperCase()}
                  </div>
                ) : null}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: selected === opt.id ? '#4caf7d' : '#333',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: focused
                      ? '#fff'
                      : selected === opt.id
                        ? '#4caf7d'
                        : '#888',
                  }}
                >
                  {opt.label}
                </span>
              </div>
            )}
          </Button>
        ))}
        <Button fKey={`${fKey}-close`} onClick={close}>
          {({ focused }) => (
            <div
              style={{
                padding: '10px 24px',
                fontSize: 12,
                color: focused ? '#fff' : '#444',
                borderLeft: focused
                  ? '2px solid #4fc3f7'
                  : '2px solid transparent',
                marginTop: 8,
              }}
            >
              ← Back
            </div>
          )}
        </Button>
      </VerticalList>
    </div>
  );
}

function ChannelListPanel({
  fKey,
  onEvent,
  channels,
  current,
  onSelect,
  close,
  panelState,
}: MultiLayerPanelProps & {
  channels: ContentItem[];
  current: ContentItem;
  onSelect: (ch: ContentItem) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 280,
        background: 'rgba(10,10,20,0.95)',
        borderLeft: '1px solid #1e1e3a',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        transform: panelState === 'open' ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#4fc3f7',
          marginBottom: 16,
          paddingLeft: 16,
          letterSpacing: '0.08em',
        }}
      >
        Channels
      </div>
      <VerticalList
        fKey={fKey}
        onEvent={onEvent}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {channels.map((ch) => {
          const isActive = ch.id === current.id;
          return (
            <Button
              key={ch.id}
              fKey={`${fKey}-${ch.id}`}
              onClick={() => {
                onSelect(ch);
                close();
              }}
            >
              {({ focused }) => (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 16px',
                    background: focused
                      ? 'rgba(79,195,247,0.1)'
                      : isActive
                        ? 'rgba(79,195,247,0.06)'
                        : 'transparent',
                    borderLeft: focused
                      ? '2px solid #4fc3f7'
                      : isActive
                        ? '2px solid #4fc3f766'
                        : '2px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: ch.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: focused ? '#fff' : isActive ? '#4fc3f7' : '#888',
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    {ch.title}
                  </span>
                </div>
              )}
            </Button>
          );
        })}
        <Button fKey={`${fKey}-close`} onClick={close}>
          {({ focused }) => (
            <div
              style={{
                padding: '10px 16px',
                fontSize: 12,
                color: focused ? '#fff' : '#444',
                borderLeft: focused
                  ? '2px solid #4fc3f7'
                  : '2px solid transparent',
                marginTop: 8,
              }}
            >
              ← Back
            </div>
          )}
        </Button>
      </VerticalList>
    </div>
  );
}

const NOTIFICATIONS = [
  { id: 'n1', title: 'Now Playing', body: '' },
  {
    id: 'n2',
    title: 'New Episode Available',
    body: 'A new episode of your favourite series has been added.',
  },
  {
    id: 'n3',
    title: 'Recommendation',
    body: 'Based on your watch history, you might enjoy similar titles.',
  },
  {
    id: 'n4',
    title: 'Reminder',
    body: 'Your watchlist has 3 unwatched items.',
  },
];

function NotificationsPanel({
  fKey,
  onEvent,
  close,
  current,
  panelState,
}: MultiLayerPanelProps & { current: ContentItem }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 280,
        background: 'rgba(10,10,20,0.95)',
        borderBottom: '1px solid #1e1e3a',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 0',
        transform:
          panelState === 'open' ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#4fc3f7',
          marginBottom: 12,
          paddingLeft: 24,
          letterSpacing: '0.08em',
        }}
      >
        Notifications
      </div>
      <VerticalList
        fKey={fKey}
        onEvent={onEvent}
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Button fKey={`${fKey}-nowplaying`} onClick={() => {}}>
          {({ focused }) => (
            <div
              style={{
                padding: '10px 24px',
                background: focused
                  ? 'rgba(79,195,247,0.1)'
                  : 'rgba(79,195,247,0.04)',
                borderLeft: focused
                  ? '2px solid #4fc3f7'
                  : '2px solid #4fc3f733',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#4fc3f7',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  marginBottom: 3,
                }}
              >
                NOW PLAYING
              </div>
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>
                {current.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {current.year}
              </div>
            </div>
          )}
        </Button>
        {NOTIFICATIONS.slice(1).map((n) => (
          <Button key={n.id} fKey={`${fKey}-${n.id}`} onClick={() => {}}>
            {({ focused }) => (
              <div
                style={{
                  padding: '10px 24px',
                  background: focused ? 'rgba(79,195,247,0.1)' : 'transparent',
                  borderLeft: focused
                    ? '2px solid #4fc3f7'
                    : '2px solid transparent',
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: focused ? '#fff' : '#ccc',
                    fontWeight: 600,
                  }}
                >
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {n.body}
                </div>
              </div>
            )}
          </Button>
        ))}
        <Button fKey={`${fKey}-close`} onClick={close}>
          {({ focused }) => (
            <div
              style={{
                padding: '10px 24px',
                fontSize: 12,
                color: focused ? '#fff' : '#444',
                borderLeft: focused
                  ? '2px solid #4fc3f7'
                  : '2px solid transparent',
                marginTop: 4,
              }}
            >
              ← Back
            </div>
          )}
        </Button>
      </VerticalList>
    </div>
  );
}

const CONTROL_BUTTONS = [
  { id: 'prev', label: '⏮', title: 'Previous' },
  { id: 'play_pause', label: '', title: 'Play/Pause' },
  { id: 'next', label: '⏭', title: 'Next' },
  { id: 'stop', label: '⏹', title: 'Stop' },
];

function ControlsPanel({
  fKey,
  onEvent,
  close,
  paused,
  onTogglePause,
  onNext,
  onPrev,
  panelState,
}: MultiLayerPanelProps & {
  paused: boolean;
  onTogglePause: () => void;
  onNext: () => boolean;
  onPrev: () => boolean;
}) {
  const [progress, setProgress] = useState(32);
  const [volume, setVolume] = useState(80);

  const handleControl = (id: string) => {
    if (id === 'play_pause') onTogglePause();
    else if (id === 'next') onNext();
    else if (id === 'prev') onPrev();
    else if (id === 'stop') close();
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10,10,20,0.95)',
        borderTop: '1px solid #1e1e3a',
        backdropFilter: 'blur(12px)',
        padding: '20px 32px 24px',
        transform: panelState === 'open' ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.25s ease',
        zIndex: 10,
      }}
    >
      <VerticalList
        fKey={fKey}
        onEvent={onEvent}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <HorizontalList
          fKey={`${fKey}-buttons`}
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          {CONTROL_BUTTONS.map((btn) => (
            <Button
              key={btn.id}
              fKey={`${fKey}-${btn.id}`}
              onClick={() => handleControl(btn.id)}
            >
              {({ focused }) => (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    background: focused
                      ? 'rgba(79,195,247,0.18)'
                      : 'rgba(255,255,255,0.06)',
                    border: focused
                      ? '2px solid #4fc3f7'
                      : '2px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 24, lineHeight: 1 }}>
                    {btn.id === 'play_pause' ? (paused ? '▶' : '⏸') : btn.label}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: focused ? '#4fc3f7' : '#555',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {btn.id === 'play_pause'
                      ? paused
                        ? 'PLAY'
                        : 'PAUSE'
                      : btn.title.toUpperCase()}
                  </span>
                </div>
              )}
            </Button>
          ))}
        </HorizontalList>

        <Button fKey={`${fKey}-progress`} onClick={() => {}}>
          {({ focused }) => (
            <div style={{ padding: '4px 0 8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, color: '#666' }}>Progress</span>
                <span
                  style={{ fontSize: 11, color: focused ? '#4fc3f7' : '#666' }}
                >
                  {progress}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  border: focused
                    ? '1px solid #4fc3f744'
                    : '1px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setProgress(
                    Math.round(((e.clientX - rect.left) / rect.width) * 100),
                  );
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: '#4fc3f7',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}
        </Button>

        <Button fKey={`${fKey}-volume`} onClick={() => {}}>
          {({ focused }) => (
            <div style={{ padding: '4px 0' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, color: '#666' }}>🔊 Volume</span>
                <span
                  style={{ fontSize: 11, color: focused ? '#4fc3f7' : '#666' }}
                >
                  {volume}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.1)',
                  border: focused
                    ? '1px solid #4fc3f744'
                    : '1px solid transparent',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setVolume(
                    Math.round(((e.clientX - rect.left) / rect.width) * 100),
                  );
                }}
              >
                <div
                  style={{
                    width: `${volume}%`,
                    height: '100%',
                    background: '#4caf7d',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )}
        </Button>

        <Button fKey={`${fKey}-close`} onClick={close}>
          {({ focused }) => (
            <div
              style={{
                padding: '8px 0',
                fontSize: 12,
                color: focused ? '#fff' : '#444',
                borderTop: '1px solid #1e1e3a',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              ← Back
            </div>
          )}
        </Button>
      </VerticalList>
    </div>
  );
}
