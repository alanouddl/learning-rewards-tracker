import { I } from '../components/Icon';
import { useState } from 'react';
import { friendlyError, supabase, toLoginEmail } from '../lib/supabase';
import { DeskScene, Flower, Sparkle, Star } from '../components/Decor';
import { Logo } from '../components/Layout';

export default function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(user), password: pass });
    setBusy(false);
    if (error) setErr(friendlyError(error));
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        <Flower className="absolute -right-6 -top-8 h-20 w-20 animate-floaty" />
        <Flower className="absolute -bottom-6 -left-4 h-14 w-14 animate-floaty [animation-delay:1s]" color="#f6a1c1" center="#fff4f7" />
        <Star className="absolute -top-4 left-10 h-5 w-5 animate-twinkle" color="#fff" />
        <Sparkle className="absolute right-8 top-24 h-4 w-4 animate-twinkle [animation-delay:.6s]" />
        <form onSubmit={submit} className="card relative space-y-4 !p-6">
          <div className="text-center">
            <DeskScene className="mx-auto -mt-2 w-56" />
            <h1 className="pt-1"><Logo size="text-6xl" /></h1>
            <p className="mt-2 eyebrow">LEARN · GROW · SHINE</p>
            <p className="mt-1 text-sm text-plum-soft">خطوة كل يوم نحو حلمك <I n="sparkles" /></p>
          </div>
          <label className="block">
            <span className="label">اسم المستخدم أو البريد</span>
            <input className="input ltr text-left" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">كلمة المرور</span>
            <input className="input ltr text-left" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          </label>
          {err && <p className="rounded-2xl bg-blush-50 p-2.5 text-center text-sm text-blush-500">{err}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? '…' : 'دخول'}</button>
          <p className="text-center text-xs text-plum-faint"><I n="lock" /> موقع خاص للعائلة فقط</p>
        </form>
      </div>
    </div>
  );
}
