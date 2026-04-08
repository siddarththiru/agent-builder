import { AppProviders } from "./providers";
import { AppRouter } from "./AppRouter";

export const App = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};
