/**
 * Shared UI components with basic styling.
 */
import { CSSProperties, ReactNode } from 'react';

// Shared styles
const styles = {
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  } as CSSProperties,
  buttonPrimary: {
    backgroundColor: '#2563eb',
    color: 'white',
  } as CSSProperties,
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  } as CSSProperties,
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  } as CSSProperties,
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  } as CSSProperties,
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  } as CSSProperties,
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '16px',
  } as CSSProperties,
  tag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    fontSize: '12px',
    marginRight: '4px',
    marginBottom: '4px',
  } as CSSProperties,
};

// Button
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: CSSProperties;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        ...(variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary),
        ...(disabled ? styles.buttonDisabled : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// Input
interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'datetime-local';
  required?: boolean;
  style?: CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  style,
  onFocus,
  onBlur,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{ ...styles.input, ...style }}
      onFocus={onFocus}
      onBlur={onBlur}
    />
  );
}

// Textarea
interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  style?: CSSProperties;
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  style,
}: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...styles.input, resize: 'vertical', ...style }}
    />
  );
}

// FormField
interface FormFieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  error?: string;
}

export function FormField({ label, required, children, error }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={styles.label}>
        {label}
        {required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
      {error && (
        <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Card
interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Card({ children, style }: CardProps) {
  return <div style={{ ...styles.card, ...style }}>{children}</div>;
}

// Tag
interface TagProps {
  children: ReactNode;
}

export function Tag({ children }: TagProps) {
  return <span style={styles.tag}>{children}</span>;
}

// Loading Spinner
export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: '2px solid #e5e7eb',
        borderTopColor: '#2563eb',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
}

// Loading State
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: '#6b7280',
      }}
    >
      <LoadingSpinner />
      <p style={{ marginTop: '16px' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Empty State
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px',
        color: '#6b7280',
      }}
    >
      <p style={{ fontSize: '18px', fontWeight: 500, color: '#374151' }}>
        {title}
      </p>
      {description && <p style={{ marginTop: '8px' }}>{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

// Error State
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px',
        color: '#ef4444',
      }}
    >
      <p style={{ fontSize: '18px', fontWeight: 500 }}>Something went wrong</p>
      <p style={{ marginTop: '8px', color: '#6b7280' }}>{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="secondary"
          style={{ marginTop: '16px' }}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
