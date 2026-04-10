import { createTheme, type ThemeOptions } from '@mui/material/styles';

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#a8c7fa', // Material You blue
    },
    secondary: {
      main: '#c2e7ff',
    },
    background: {
      default: '#1f1f1f',
      paper: '#2d2d2d',
    },
    text: {
      primary: '#e3e3e3',
      secondary: '#9e9e9e',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
    fontSize: 13,
  },
};

export const darkTheme = createTheme(darkThemeOptions);

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0b57d0', // Material You blue
    },
    secondary: {
      main: '#004a77',
    },
    background: {
      default: '#ffffff',
      paper: '#f3f3f3',
    },
    text: {
      primary: '#1f1f1f',
      secondary: '#5e5e5e',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
    fontSize: 13,
  },
});
