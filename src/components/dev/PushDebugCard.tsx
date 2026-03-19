import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getPushPermissionStatus } from '@/lib/pushNotifications';
import { getCurrentPlatform } from '@/lib/platform';
import { supabase } from '@/integrations/supabase/client';

export function PushDebugCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<string>('...');
  const [platform] = useState(() => getCurrentPlatform());
  const [tokens, setTokens] = useState<{ token: string; platform: string; updated_at: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    getPushPermissionStatus().then(s => setPermission(s));
    if (user?.id) {
      supabase
        .from('user_fcm_tokens')
        .select('token, platform, updated_at')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) setTokens(data);
        });
    }
  }, [open, user?.id]);

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({ title: 'Copied', description: 'Token copied to clipboard' });
  };

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <Bug className="h-4 w-4" />
          Push Debug
          {open ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted-foreground">Platform:</span>
            <Badge variant="outline" className="font-mono text-xs w-fit">{platform}</Badge>

            <span className="text-muted-foreground">Permission:</span>
            <Badge
              variant={permission === 'granted' ? 'default' : 'outline'}
              className="font-mono text-xs w-fit"
            >
              {permission}
            </Badge>

            <span className="text-muted-foreground">Tokens in DB:</span>
            <Badge variant="outline" className="font-mono text-xs w-fit">{tokens.length}</Badge>
          </div>

          {tokens.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-2">
              <div className="flex-1 min-w-0">
                <div className="font-mono truncate">{t.token}</div>
                <div className="text-muted-foreground mt-0.5">
                  {t.platform} · {new Date(t.updated_at).toLocaleString()}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => copyToken(t.token)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {tokens.length === 0 && (
            <p className="text-xs text-muted-foreground">No tokens registered for this user.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
