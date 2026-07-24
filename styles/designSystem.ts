export const tokens = {
  colors: {
    brand: {
      verdeBrasil: '#1A9E49',
      amareloOuro: '#FFC709',
      azulHorizonte: '#0070F3',
    },
    neutral: {
      branco: '#FFFFFF',
      grafite: '#2D312E',
      cinzaClaro: '#F4F6F5',
      cinzaBorda: '#E1E5E3',
    }
  },
  fonts: {
    family: 'Inter, sans-serif',
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    sizes: {
      legend: '12px',
      body: '14px',
      button: '16px',
      subtitle: '18px',
      title: '24px',
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
    huge: '48px',
    giant: '64px',
  },
  borderRadius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '28px',
    pill: '9999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(45, 49, 46, 0.05)',
    md: '0 4px 12px rgba(45, 49, 46, 0.08)',
  },
  animations: {
    fast: 'all 0.2s ease-in-out',
    normal: 'all 0.3s ease-in-out',
  }
} as const;

export type DesignTokens = typeof tokens;