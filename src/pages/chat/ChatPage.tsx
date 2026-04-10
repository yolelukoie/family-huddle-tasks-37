import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useChat } from '@/hooks/useChat';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Send, Trash2, Ban } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { isBlocked, getBlockTimeRemaining, formatBlockTimeRemaining } from '@/lib/blockUtils';
import { ROUTES } from '@/lib/constants';

export default function ChatPage() {
  const { user } = useAuth();
  const { activeFamilyId, getUserFamily } = useApp();
  const { messages, sendMessage: sendChatMessage, clearChat } = useChat();
  const { gateAsync } = useFeatureGate();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Handle loading and missing data states
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!activeFamilyId) {
    // User exists but has no active family - redirect to onboarding to complete family setup
    setTimeout(() => navigate('/onboarding', { replace: true }), 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('tasks.settingUpFamily')}</p>
        </div>
      </div>
    );
  }

  // Check if user is blocked in this family
  const userFamily = getUserFamily(activeFamilyId);
  if (isBlocked(userFamily)) {
    const remaining = getBlockTimeRemaining(userFamily);
    const timeStr = remaining === Infinity ? '' : formatBlockTimeRemaining(remaining);

    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
        <NavigationHeader title={t('chat.title')} />
        <div className="max-w-4xl mx-auto p-4">
          <Card accent>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ban className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-lg font-semibold mb-2">{t('block.chatRestricted')}</h2>
              <p className="text-muted-foreground text-center mb-4">
                {timeStr
                  ? t('block.accessRestrictedFor', { time: timeStr })
                  : t('block.cannotAccessWhileBlocked')}
              </p>
              <Button onClick={() => navigate(ROUTES.family)}>
                {t('nav.family')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const success = await gateAsync(() => sendChatMessage(message));
    if (success) {
      setMessage('');
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('chat.title')} />

      <div className="max-w-4xl mx-auto p-4 flex-1 min-h-0 flex flex-col">
        <Card accent className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('chat.title')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => gateAsync(() => clearChat())}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('chat.clearChat')}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col space-y-4">
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {t('chat.noMessages')}
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground pl-1">
                      {msg.userDisplayName}
                    </div>
                    <div
                      className={`flex ${msg.userId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.userId === user.id
                            ? 'bg-gradient-to-br from-primary to-[hsl(var(--icon-tint))] text-primary-foreground shadow-md'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm">{msg.content}</div>
                        <div className="text-xs opacity-70 mt-1">
                          {formatDate(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t shrink-0">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('chat.typeMessage')}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
