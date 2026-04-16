import { useState } from 'react';
import { createPortal } from 'react-dom';
import { VerticalList, HorizontalList, Button, Dropdown } from '@navix/react';
import { OPTIONS_CONFIG } from '../data';
import type { OptionsState, OptionKey } from '../data';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pl', label: 'Polski' },
  { value: 'ru', label: 'Русский' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

interface OptionsModalProps {
  options: OptionsState;
  onChange: (key: OptionKey, value: string) => void;
  onClose: () => void;
}

export function OptionsModal({ options, onChange, onClose }: OptionsModalProps) {
  const [language, setLanguage] = useState(['en']);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#12121f',
          border: '1px solid #1e1e3a',
          borderRadius: 12,
          padding: '32px 36px',
          width: 520,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#eee', marginBottom: 28 }}>
          Options
        </div>

        <VerticalList fKey="options-list">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ width: 100, fontSize: 13, color: '#666', flexShrink: 0 }}>Language</div>
            <Dropdown
              fKey="options-language"
              options={LANGUAGES}
              value={language}
              onChange={setLanguage}
              maxVisible={5}
              position="bottom"
            />
          </div>

          {OPTIONS_CONFIG.map((row) => (
            <OptionRow
              key={row.key}
              fKey={`options-${row.key}`}
              label={row.label}
              choices={row.choices as unknown as string[]}
              selected={options[row.key]}
              onSelect={(value) => onChange(row.key, value)}
            />
          ))}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <HorizontalList fKey="options-actions">
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  fKey="options-close"
                  style={{ padding: '8px 24px', borderRadius: 6, background: '#1e1e3a', color: '#888', fontSize: 13, fontWeight: 600 }}
                  focusedStyle={{ background: '#4fc3f7', color: '#000' }}
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </HorizontalList>
          </div>
        </VerticalList>
      </div>
    </div>,
    document.body,
  );
}

interface OptionRowProps {
  fKey: string;
  label: string;
  choices: string[];
  selected: string;
  onSelect: (value: string) => void;
}

function OptionRow({ fKey, label, choices, selected, onSelect }: OptionRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: 16,
      }}
    >
      <div style={{ width: 100, fontSize: 13, color: '#666', flexShrink: 0 }}>{label}</div>
      <HorizontalList fKey={fKey}>
        <div style={{ display: 'flex', gap: 8 }}>
          {choices.map((choice) => {
            const isSelected = choice === selected;
            return (
              <Button
                key={choice}
                fKey={`${fKey}-${choice}`}
                style={{
                  padding: '5px 14px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  background: isSelected ? '#1e3a2e' : '#1a1a2e',
                  color: isSelected ? '#4caf7d' : '#666',
                  outline: isSelected ? '1px solid #4caf7d' : '1px solid transparent',
                }}
                focusedStyle={{ background: '#4fc3f7', color: '#000', outline: '1px solid transparent' }}
                onClick={() => onSelect(choice)}
              >
                {choice}
              </Button>
            );
          })}
        </div>
      </HorizontalList>
    </div>
  );
}
