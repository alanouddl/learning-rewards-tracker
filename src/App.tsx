import { I, IconBubble, type IconName } from './components/Icon';
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from './lib/supabase';
import { StoreProvider, useStore } from './lib/store';
import { ToastProvider } from './components/ui';
import { Layout } from './components/Layout';
import { Flower, Sparkle } from './components/Decor';
import Login from './pages/Login';
import StudentToday from './pages/student/Today';
import StudentWeek from './pages/student/Week';
import StudentCourses from './pages/student/Courses';
import StudentRewards from './pages/student/Rewards';
import StudentHistory from './pages/student/History';
import StudentEnglish from './pages/student/English';
import GuardianEnglish from './pages/guardian/English';
import GuardianHome from './pages/guardian/Home';
import GuardianReview from './pages/guardian/Review';
import GuardianCourses from './pages/guardian/Courses';
import GuardianSchedule from './pages/guardian/Schedule';
import GuardianRewards from './pages/guardian/Rewards';
import GuardianAnalytics from './pages/guardian/Analytics';
import GuardianSettings from './pages/guardian/Settings';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <Centered icon="wrench" title="الموقع يحتاج إعداد" text="لم يتم ضبط متغيرات Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). راجعي ملف README." />;
  if (session === undefined) return <Loading />;
  return (
    <ToastProvider>
      {session ? (
        <StoreProvider key={session.user.id} userId={session.user.id}>
          <Authed />
        </StoreProvider>
      ) : <Login />}
    </ToastProvider>
  );
}

function Authed() {
  const { data, error, refresh } = useStore();
  if (error === 'NO_PROFILE') {
    return <Centered icon="lock" title="هذا الحساب غير مفعّل" text="هذا الموقع خاص بحسابين فقط (ولي الأمر والطالبة)."
      action={<button className="btn-soft" onClick={() => supabase.auth.signOut()}>تسجيل الخروج</button>} />;
  }
  if (error && !data) {
    return <Centered icon="cloud" title="تعذّر تحميل البيانات" text={error}
      action={<div className="flex gap-2"><button className="btn-primary" onClick={refresh}>إعادة المحاولة</button><button className="btn-ghost" onClick={() => supabase.auth.signOut()}>خروج</button></div>} />;
  }
  if (!data) return <Loading />;
  const guardian = data.me.role === 'guardian';
  return (
    <Layout>
      <Routes>
        {guardian ? (
          <>
            <Route path="/g" element={<GuardianHome />} />
            <Route path="/g/review" element={<GuardianReview />} />
            <Route path="/g/courses" element={<GuardianCourses />} />
            <Route path="/g/schedule" element={<GuardianSchedule />} />
            <Route path="/g/rewards" element={<GuardianRewards />} />
            <Route path="/g/analytics" element={<GuardianAnalytics />} />
            <Route path="/g/english" element={<GuardianEnglish />} />
            <Route path="/g/settings" element={<GuardianSettings />} />
            <Route path="*" element={<Navigate to="/g" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<StudentToday />} />
            <Route path="/week" element={<StudentWeek />} />
            <Route path="/courses" element={<StudentCourses />} />
            <Route path="/rewards" element={<StudentRewards />} />
            <Route path="/history" element={<StudentHistory />} />
            <Route path="/english" element={<StudentEnglish />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-plum-soft">
        <Flower className="h-14 w-14 animate-spin [animation-duration:3s]" />
        <span className="text-sm">لحظة… <I n="tulip" /></span>
      </div>
    </div>
  );
}

export function Centered({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card relative max-w-md text-center">
        <Sparkle className="absolute left-5 top-5 h-4 w-4 animate-twinkle" />
        <div className="flex justify-center"><IconBubble n={icon} size="h-16 w-16" icon={28} /></div>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-plum-soft">{text}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
