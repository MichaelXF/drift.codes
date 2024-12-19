import { CssBaseline, ThemeProvider } from "@mui/material";
import { darkTheme, lightTheme } from "./theme";
import AppRouter from "./AppRouter";
import { SnackbarContextProvider } from "./hooks/useSnackbar";
import { createContext, useMemo, useState } from "react";

export const ThemeContext = createContext({
  themeName: "dark",
  setThemeName: () => {},
});

function App() {
  const [themeName, setThemeName] = useState("dark");

  // Do not include 'setThemeName' in the dependency array
  const themeValue = useMemo(() => ({ themeName, setThemeName }), [themeName]);

  return (
    <ThemeContext.Provider value={themeValue}>
      <ThemeProvider theme={themeName === "light" ? lightTheme : darkTheme}>
        <CssBaseline />

        <SnackbarContextProvider>
          <AppRouter />
        </SnackbarContextProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
