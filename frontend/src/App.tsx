/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * App - Point d'entrée de l'application
 */

import { AppProvider } from "./components/AppProvider";
import AppRouter from "./components/AppRouter";

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}

