import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { analytics } from '@/lib/analytics';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'he', label: 'עברית' },
  { code: 'ar', label: 'العربية' },
];

const SEEN_KEY = 'language_picker_seen';
const LANG_KEY = 'app-language';

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'true';
  } catch {
    return true;
  }
}

function readExistingLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

export function LanguagePicker() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readSeen()) return;
    if (readExistingLang()) {
      try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* ignore */ }
      return;
    }
    setOpen(true);
  }, []);

  const handlePick = (code: string) => {
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
    try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* ignore */ }
    void i18n.changeLanguage(code);
    void (async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await supabase.from('profiles').update({ preferred_language: code }).eq('id', session.user.id);
        }
      } catch { /* ignore */ }
    })();
    analytics.capture('first_launch_language_selected', { language: code });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="max-w-sm [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base font-medium leading-relaxed">
            Choose your language<br />
            Выберите язык<br />
            اختر لغتك
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="grid gap-2 mt-2">
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant="outline"
              className="w-full justify-center text-base"
              onClick={() => handlePick(lang.code)}
            >
              {lang.label}
            </Button>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
