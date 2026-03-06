import React from 'react';

type ToolbarIconButtonProps = {
  className?: string;
  label: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  withTooltip?: boolean;
};

export default function ToolbarIconButton({
  className,
  label,
  title,
  active = false,
  disabled = false,
  onClick,
  children,
  withTooltip = false,
}: ToolbarIconButtonProps) {
  const button = (
    <button
      type="button"
      className={`btn-icon ${active ? 'active' : ''} ${className ?? ''}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );

  if (!withTooltip) {
    return button;
  }

  return (
    <div className="tooltip">
      {button}
      <span className="tooltip-text">{title ?? label}</span>
    </div>
  );
}
