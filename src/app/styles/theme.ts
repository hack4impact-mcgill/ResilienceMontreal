"use client";
import { createTheme } from "@mui/material/styles";
import sharedTheme from "../../../sharedTheme";

const theme = createTheme({
  typography: {
    fontFamily: sharedTheme.typography.fontFamily,
    fontSize: sharedTheme.typography.fontSize,
  },
  palette: {
    primary: { main: sharedTheme.light.colors.primary },
    secondary: { main: sharedTheme.light.colors.secondary },
    background: { default: sharedTheme.light.colors.background },
    text: { primary: sharedTheme.light.colors.foreground },
  },
});

export default theme;
