import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#f4f7ff",
      100: "#e5edff",
      200: "#d2e0ff",
      300: "#bfd3ff",
      400: "#aac4f5",
      500: "#8ca9ff",
      600: "#7089db",
      700: "#576bb5",
      800: "#42518e",
      900: "#2d3868",
    },
    sand: {
      50: "#fffdf5",
      100: "#fff8de",
      200: "#fff2c6",
      300: "#f7e9b7",
      400: "#eddea8",
      500: "#d8c891",
      600: "#b5a776",
      700: "#91855d",
      800: "#6b6345",
      900: "#46402d",
    },
    slate: {
      50: "#f7f8fa",
      100: "#eef1f5",
      200: "#dfe5ed",
      300: "#c7d0db",
      400: "#9aa8ba",
      500: "#6b7788",
      600: "#4f5968",
      700: "#39424f",
      800: "#242b35",
      900: "#11161e",
    },
    status: {
      success: "#4f9f78",
      pending: "#6f8bbf",
      warning: "#c99648",
      danger: "#b46767",
      info: "#5b89c6",
    },
  },
  fonts: {
    heading: "'Manrope', 'Segoe UI', sans-serif",
    body: "'Manrope', 'Segoe UI', sans-serif",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  radii: {
    sm: "10px",
    md: "14px",
    lg: "18px",
    xl: "22px",
  },
  shadows: {
    card: "0 6px 22px rgba(17, 22, 30, 0.06)",
    floating: "0 14px 30px rgba(17, 22, 30, 0.1)",
  },
  semanticTokens: {
    colors: {
      "bg.canvas": "sand.50",
      "bg.panel": "sand.100",
      "bg.surface": "white",
      "bg.surfaceMuted": "#f8fafc",
      "border.soft": "#e4e8ef",
      "border.strong": "#cdd5e1",
      "text.primary": "#1b2430",
      "text.secondary": "#4f5968",
      "text.muted": "#6b7788",
      "accent.primary": "brand.500",
    },
  },
  space: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
  },
  styles: {
    global: {
      "html, body, #root": {
        minHeight: "100%",
      },
      body: {
        bg: "bg.canvas",
        color: "text.primary",
        letterSpacing: "0.01em",
      },
      "*:focus-visible": {
        outline: "2px solid",
        outlineColor: "brand.400",
        outlineOffset: "2px",
      },
      ".app-page-container": {
        maxW: "1200px",
        width: "100%",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "md",
        fontWeight: "600",
        transitionProperty: "common",
        transitionDuration: "200ms",
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: "full",
        fontWeight: "600",
        px: 3,
        py: 1,
      },
    },
  },
});
