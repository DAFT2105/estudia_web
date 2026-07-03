// src/App.tsx
//
// Equivalente a la clase `EstudioApp` de main.dart -- el MultiProvider se
// traduce a Context Providers anidados.

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
import { SubjectProvider } from '@/context/SubjectProvider';
import { StudentProvider } from '@/context/StudentProvider';
import { QuestionProvider } from '@/context/QuestionProvider';
import { QuestionSetProvider } from '@/context/QuestionSetProvider';
import { ResultProvider } from '@/context/ResultProvider';
import { ToastProvider } from '@/context/ToastProvider';
import { ConfirmProvider } from '@/context/ConfirmProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { AppRouter } from '@/router/AppRouter';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <SubjectProvider>
                <StudentProvider>
                  <QuestionProvider>
                    <QuestionSetProvider>
                      <ResultProvider>
                        <ConnectionBanner />
                        <AppRouter />
                      </ResultProvider>
                    </QuestionSetProvider>
                  </QuestionProvider>
                </StudentProvider>
              </SubjectProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
