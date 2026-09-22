import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

import { AccessibilityProvider } from "./accessibility/AccessibilityContext";
import { AnnouncementProvider }  from "./accessibility/AnnouncementContext";
import { AuthProvider }          from "./auth/AuthContext";
import { ThemeWrapper }          from "./components/ThemeWrapper";
import { Layout }                from "./components/Layout";
import { ProtectedRoute }        from "./components/ProtectedRoute";
import { NavigationProvider }    from "./navigation/NavigationContext";
import { VoiceNavProvider }      from "./navigation/VoiceNavProvider";
import { FirstRunModal }         from "./navigation/FirstRunModal";
import { setUnauthorizedHandler } from "./api/client";
import { useNavigation }         from "./navigation/NavigationContext";
import { useAccessibility }      from "./accessibility/AccessibilityContext";

// Pages — shared
import HomePage      from "./pages/HomePage";
import LoginPage     from "./pages/LoginPage";
import RegisterPage  from "./pages/RegisterPage";
import HelpPage      from "./pages/HelpPage";

// Pages — student only
import SolvePage     from "./pages/SolvePage";
import PracticePage  from "./pages/PracticePage";
import ProgressPage  from "./pages/ProgressPage";
import SettingsPage  from "./pages/SettingsPage";
import StoryPage     from "./pages/StoryPage";

// Pages — teacher only
import TeacherDashboardPage from "./pages/teacher/TeacherDashboardPage";
import { TeacherStudentsPage, TeacherStudentDetailPage } from "./pages/teacher/TeacherStudentsPage";
import TeacherAssignmentsPage from "./pages/teacher/TeacherAssignmentsPage";

function AuthWatcher() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      try { localStorage.removeItem("mathable_token"); } catch { /* ignore */ }
    });
  }, []);
  return null;
}

/** Inner app — has access to NavigationContext and AccessibilityContext */
function AppInner() {
  const { isFirstRun } = useNavigation();
  const { settings }   = useAccessibility();

  return (
    <VoiceNavProvider ttsRate={settings.tts_rate} ttsVoice={settings.tts_voice}>
      <ThemeWrapper>
        {isFirstRun && <FirstRunModal />}
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route index element={<HomePage />} />
            <Route path="login"    element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="help"     element={<HelpPage />} />

            {/* Student-only */}
            <Route path="solve"    element={<ProtectedRoute requireRole="student"><SolvePage /></ProtectedRoute>} />
            <Route path="practice" element={<ProtectedRoute requireRole="student"><PracticePage /></ProtectedRoute>} />
            <Route path="progress" element={<ProtectedRoute requireRole="student"><ProgressPage /></ProtectedRoute>} />
            <Route path="story"    element={<ProtectedRoute requireRole="student"><StoryPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* Teacher-only */}
            <Route path="teacher" element={<ProtectedRoute requireRole="teacher"><TeacherDashboardPage /></ProtectedRoute>} />
            <Route path="teacher/students" element={<ProtectedRoute requireRole="teacher"><TeacherStudentsPage /></ProtectedRoute>} />
            <Route path="teacher/students/:id" element={<ProtectedRoute requireRole="teacher"><TeacherStudentDetailPage /></ProtectedRoute>} />
            <Route path="teacher/assignments" element={<ProtectedRoute requireRole="teacher"><TeacherAssignmentsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </ThemeWrapper>
    </VoiceNavProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AnnouncementProvider>
        <AccessibilityProvider>
          <NavigationProvider>
            <HashRouter>
              <AuthWatcher />
              <AppInner />
            </HashRouter>
          </NavigationProvider>
        </AccessibilityProvider>
      </AnnouncementProvider>
    </AuthProvider>
  );
}
