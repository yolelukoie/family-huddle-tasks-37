import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, User } from 'lucide-react';

export function DevStatus() {
  const { user, sessionId, clearAuth } = useAuth();
  const { activeFamilyId } = useApp();
  
  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 opacity-90 z-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" />
          Dev Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">User ID:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {user?.id?.substring(0, 8) || 'None'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Session:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {sessionId?.substring(0, 8) || 'None'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Active Family:</span>
            <Badge variant="outline" className="font-mono text-xs">
              {activeFamilyId?.substring(0, 8) || 'None'}
            </Badge>
          </div>
        </div>
        <Button
          onClick={clearAuth}
          variant="destructive"
          size="sm"
          className="w-full h-7 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear Auth & Local State
        </Button>
      </CardContent>
    </Card>
  );
}