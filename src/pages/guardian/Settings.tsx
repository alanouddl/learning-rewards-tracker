import { I } from '../../components/Icon';
import { useState } from 'react';
import { supabase, friendlyError } from '../../lib/supabase';
import { useData } from '../../lib/store';
import { sar } from '../../lib/format';
import { Card, Field, useToast } from '../../components/ui';

export default function GuardianSettings() {
  const d = useData();
  const toast = useToast();
  const student = d.profiles.find((p) => p.role === 'student');
  const [name, setName] = useState(student?.display_name ?? '');
  const [goal, setGoal] = useState(d.settings.goal_label);
  const [msg, setMsg] = useState(d.settings.guardian_message);
  const [pw, setPw] = useState('');

  async function save() {
    const e1 = (await supabase.from('settings').update({ goal_label: goal, guardian_message: msg, updated_at: new Date().toISOString() }).eq('id', 1)).error;
    const e2 = student ? (await supabase.from('profiles').update({ display_name: name || 'بطلة' }).eq('id', student.id)).error : null;
    if (e1 || e2) return toast(friendlyError(e1 || e2), 'err');
    toast('تم الحفظ'); d.refresh();
  }
  async function changePw() {
    if (pw.length < 8) return toast('كلمة المرور ٨ أحرف على الأقل', 'err');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast(friendlyError(error), 'err');
    setPw(''); toast('تم تغيير كلمة المرور');
  }

  return (
    <>
      <h1 className="section-title px-1 text-2xl"><I n="settings" /> الإعدادات</h1>
      <Card>
        <div className="space-y-3">
          <Field label="اسم الطالبة (يظهر في الواجهة)"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="اسم الهدف"><input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} /></Field>
          <Field label="رسالة تشجيعية تظهر في صفحتها الرئيسية"><textarea className="input min-h-16" value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
          <p className="text-sm text-plum-soft">الميزانية الكلية: <b>{sar(d.settings.total_budget)}</b> (ثابتة؛ لا يمكن تجاوزها)</p>
          <button className="btn-primary" onClick={save}>حفظ</button>
        </div>
      </Card>
      <Card>
        <h2 className="section-title mb-2"><I n="lock" /> كلمة مرور حسابي</h2>
        <div className="flex gap-2"><input type="password" className="input ltr" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="كلمة مرور جديدة" autoComplete="new-password" />
          <button className="btn-soft" onClick={changePw}>تغيير</button></div>
        <p className="mt-2 text-xs text-plum-soft">لتغيير كلمة مرور الطالبة: Supabase ← Authentication ← Users.</p>
      </Card>
      <Card>
        <h2 className="section-title mb-2"><I n="shield" /> الخصوصية</h2>
        <ul className="list-disc space-y-1 pr-5 text-sm text-plum-soft">
          <li>الموقع خاص: لا توجد صفحات عامة، ولا دردشة، ولا لوحات ترتيب.</li>
          <li>لا إعلانات ولا أدوات تتبع. الخطوط مضمّنة داخل الموقع.</li>
          <li>البيانات محمية بصلاحيات على مستوى قاعدة البيانات (RLS): حسابان فقط يمكنهما القراءة.</li>
          <li>فقط ولي الأمر يستطيع اعتماد المكافآت أو تسجيل تسليمها.</li>
        </ul>
      </Card>
    </>
  );
}
