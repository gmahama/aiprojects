'use client';

import { useState, KeyboardEvent } from 'react';
import { Tag } from '@/components/ui';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/**
 * Normalizes a tag: trims whitespace, lowercases, and returns empty string if invalid.
 */
function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Deduplicates an array of tags while preserving order.
 */
function dedupeTags(tags: string[]): string[] {
  return Array.from(new Set(tags));
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (value: string) => {
    const normalized = normalizeTag(value);
    if (!normalized) return;

    // Don't add duplicates
    if (tags.includes(normalized)) {
      setInputValue('');
      return;
    }

    onChange(dedupeTags([...tags, normalized]));
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspacing on empty input
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      {/* Display existing tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  color: '#6366f1',
                  fontSize: '14px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input for new tags */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
        Press Enter to add a tag
      </p>
    </div>
  );
}
