import React from 'react';

export default function ToggleSwitch({
  checked = false,
  loading = false,
  disabled = false,
  onChange,
  label,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={loading || disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        checked
          ? 'bg-green-500'
          : 'bg-gray-300 dark:bg-zinc-700'
      } ${(loading || disabled) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
