// components/ui/primitives.jsx
// Composants UI réutilisables : Badge, Button, Card, Input, Select

// ── Badge ─────────────────────────────────────────────────
export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-stone-200 text-stone-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger:  'bg-red-100 text-red-800',
    organic: 'bg-green-100 text-green-800 border border-green-300',
    info:    'bg-sky-100 text-sky-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// ── Button ────────────────────────────────────────────────
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const variants = {
    primary:   'bg-[#2D5016] hover:bg-[#1e3a0f] text-white shadow-md hover:shadow-lg',
    secondary: 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300',
    outline:   'border-2 border-[#2D5016] text-[#2D5016] hover:bg-[#2D5016] hover:text-white',
    ghost:     'text-stone-600 hover:bg-stone-100',
    danger:    'bg-red-600 hover:bg-red-700 text-white',
    success:   'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-xl
        transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ── Card ──────────────────────────────────────────────────
export const Card = ({ children, className = '', hover = false }) => (
  <div
    className={`bg-white rounded-2xl border border-stone-200 overflow-hidden
      ${hover
        ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300'
        : 'shadow-sm'}
      ${className}`}
  >
    {children}
  </div>
);

// ── Input ─────────────────────────────────────────────────
export const Input = ({ label, icon, className = '', ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
          {icon}
        </span>
      )}
      <input
        className={`w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5
          text-stone-900 placeholder-stone-400
          focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20
          transition-all ${icon ? 'pl-10' : ''}`}
        {...props}
      />
    </div>
  </div>
);

// ── Select ────────────────────────────────────────────────
export const Select = ({ label, options, className = '', ...props }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
      </label>
    )}
    <select
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5
        text-stone-900 focus:border-[#2D5016] focus:ring-2 focus:ring-[#2D5016]/20
        transition-all appearance-none cursor-pointer"
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
