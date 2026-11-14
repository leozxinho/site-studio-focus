/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './admin/**/*.html',
    './admin/**/*.js',
    './treinos/**/*.html',
    './treinos/**/*.js',
    './*.html',
    './*.js',
  ],
  safelist: [
    // Status dinâmico: ATIVO=green, PENDENTE=yellow, INATIVO/VENCIDO=red
    'bg-green-500/10', 'text-green-500',
    'bg-yellow-500/10', 'text-yellow-500',
    'bg-red-500/10',   'text-red-500',
    // Inadimplente / alertas
    'bg-red-500/5',   'bg-red-500/20',
    'border-red-500',  'border-red-500/20', 'border-red-500/40',
    'text-red-400',
    // Alerta de vencimento com cor dinâmica (cor = red | orange | pu)
    'bg-red-500/20',   'text-red-500',
    'bg-orange-500/20','text-orange-500',
    // Emerald / verde
    'bg-emerald-500/10', 'text-emerald-400', 'text-emerald-300',
    'bg-emerald-600', 'bg-emerald-700',
    'border-emerald-500/20',
    // Outros estáticos usados no JS
    'bg-green-600', 'bg-green-700',
    'text-green-500', 'text-green-400',
    'text-yellow-400', 'text-yellow-500',
    'border-yellow-500',
    // Azul
    'bg-blue-600',
    // Animações / utilitários
    'animate-pulse', 'animate-spin',
    'opacity-0', 'opacity-100',
    'translate-y-4', '-translate-y-0.5',
    'pointer-events-none',
    // Toast
    'bg-red-600',
    // Linha inadimplente na tabela
    'border-l-4', 'border-l-red-500',
    // Hover dinâmico nos cards
    'hover:text-green-500', 'hover:text-red-500',
    'hover:border-pu/50',
  ],
  theme: {
    extend: {
      colors: {
        pu:  'var(--pu)',
        pu2: 'var(--pu2)',
        s1:  'var(--s1)',
        s2:  'var(--s2)',
        s3:  'var(--s3)',
        mt:  'var(--mt)',
        bd:  'var(--bd)',
        tx:  'var(--tx)',
        bg:  'var(--bg)',
      },
      fontFamily: {
        bebas: ['Bebas Neue', 'sans-serif'],
        sans:  ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
