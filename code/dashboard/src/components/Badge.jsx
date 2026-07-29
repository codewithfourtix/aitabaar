import React from 'react';

const Badge = ({ children, variant = 'default' }) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16, 185, 129, 0.2)' };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', border: '1px solid rgba(245, 158, 11, 0.2)' };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' };
      case 'info':
        return { bg: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(99, 102, 241, 0.2)' };
      default:
        return { bg: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
    }
  };

  const style = {
    ...getColors(),
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return <span style={style}>{children}</span>;
};

export default Badge;
