import type {Config} from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        headline: ['var(--font-sans)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Liquid Glass Theme Color Tokens
        glass: {
          light: 'rgba(255, 255, 255, 0.55)',
          'light-subtle': 'rgba(255, 255, 255, 0.35)',
          'light-elevated': 'rgba(255, 255, 255, 0.70)',
          dark: 'rgba(18, 18, 24, 0.65)',
          'dark-subtle': 'rgba(18, 18, 24, 0.45)',
          'dark-elevated': 'rgba(26, 26, 36, 0.75)',
          'border-light': 'rgba(255, 255, 255, 0.45)',
          'border-dark': 'rgba(255, 255, 255, 0.14)',
          'specular-light': 'rgba(255, 255, 255, 0.75)',
          'specular-dark': 'rgba(255, 255, 255, 0.25)',
        },
      },
      borderRadius: {
        '4xl': 'calc(var(--radius) + 20px)',
        '3xl': 'calc(var(--radius) + 12px)',
        '2xl': 'calc(var(--radius) + 6px)',
        xl: 'calc(var(--radius) + 2px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-hover': '0 16px 40px 0 rgba(0, 0, 0, 0.18)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.38)',
        'glass-dark-hover': '0 16px 44px 0 rgba(0, 0, 0, 0.50)',
        'glass-specular': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.60), 0 8px 32px 0 rgba(0, 0, 0, 0.12)',
        'glass-specular-dark': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.20), 0 8px 32px 0 rgba(0, 0, 0, 0.38)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      backdropSaturate: {
        '150': '1.5',
        '180': '1.8',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'natural': 'cubic-bezier(0.2, 0, 0, 1)',
        'standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'micro': '120ms',
        'standard': '180ms',
        'page': '220ms',
        'complex': '280ms',
        '2000': '2000ms',
        '12000': '12000ms',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
            opacity: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
            opacity: '1',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
            opacity: '1',
          },
          to: {
            height: '0',
            opacity: '0',
          },
        },
        'liquid-pulse': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'accordion-up': 'accordion-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'liquid-pulse': 'liquid-pulse 4s ease-in-out infinite',
        'fade-in': 'fade-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-up': 'fade-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'shimmer': 'shimmer 2s infinite ease-in-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(function ({ addComponents, addUtilities }) {
      addComponents({
        '.glass-panel': {
          position: 'relative',
          backgroundColor: 'var(--glass-bg, rgba(255, 255, 255, 0.55))',
          backdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          WebkitBackdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          borderWidth: '1px',
          borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.45))',
          boxShadow: 'var(--glass-specular-shadow, inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 8px 32px 0 rgba(0, 0, 0, 0.12))',
          color: 'var(--glass-text-primary, #0f172a)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        '.glass-card': {
          position: 'relative',
          borderRadius: '1.25rem',
          backgroundColor: 'var(--glass-bg, rgba(255, 255, 255, 0.55))',
          backdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          WebkitBackdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          borderWidth: '1px',
          borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.45))',
          boxShadow: 'var(--glass-specular-shadow, inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 8px 32px 0 rgba(0, 0, 0, 0.12))',
          color: 'var(--glass-text-primary, #0f172a)',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-1.5px)',
            boxShadow: 'var(--glass-shadow-hover, 0 16px 40px 0 rgba(0, 0, 0, 0.18))',
            borderColor: 'var(--glass-border-specular, rgba(255, 255, 255, 0.70))',
          },
        },
        '.glass-nav': {
          position: 'relative',
          backgroundColor: 'var(--glass-bg, rgba(255, 255, 255, 0.60))',
          backdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          WebkitBackdropFilter: 'blur(var(--glass-blur, 20px)) saturate(var(--glass-saturate, 180%))',
          borderBottomWidth: '1px',
          borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.35))',
          boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          color: 'var(--glass-text-primary, #0f172a)',
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        },
        '.glass-button': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          borderRadius: '9999px',
          padding: '0.5rem 1rem',
          backgroundColor: 'var(--glass-bg-subtle, rgba(255, 255, 255, 0.35))',
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
          borderWidth: '1px',
          borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.45))',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), 0 2px 8px 0 rgba(0, 0, 0, 0.06)',
          color: 'var(--glass-text-primary, #0f172a)',
          transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            backgroundColor: 'var(--glass-bg-elevated, rgba(255, 255, 255, 0.65))',
            borderColor: 'var(--glass-border-specular, rgba(255, 255, 255, 0.8))',
            transform: 'scale(1.02)',
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
        },
        '.glass-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '700',
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          backdropFilter: 'blur(10px) saturate(160%)',
          WebkitBackdropFilter: 'blur(10px) saturate(160%)',
          borderWidth: '1px',
          boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.35)',
        },
      });

      // Browser fallback for clients without backdrop-filter support
      addUtilities({
        '@supports not (backdrop-filter: blur(1px))': {
          '.glass-panel, .glass-card, .glass-nav, .glass-button': {
            backgroundColor: 'var(--glass-fallback-bg, rgba(248, 250, 252, 0.96)) !important',
          },
          '.dark .glass-panel, .dark .glass-card, .dark .glass-nav, .dark .glass-button': {
            backgroundColor: 'var(--glass-fallback-bg, rgba(18, 18, 24, 0.96)) !important',
          },
        },
      });
    }),
  ],
} satisfies Config;
