import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useChat } from '@/hooks/useChat';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Send, Trash2, Ban } from 'lucide-react';
import { formatMessageTime } from '@/lib/utils';
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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);
  const TIMESTAMP_COLUMN_WIDTH = 72;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.touches[0].clientX;
    if (delta > 5) {
      isSwiping.current = true;
      setSwipeOffset(Math.min(delta, TIMESTAMP_COLUMN_WIDTH));
    }
  };
  const handleTouchEnd = () => {
    isSwiping.current = false;
    setSwipeOffset(0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const success = await gateAsync(() => sendChatMessage(message));
    if (success) {
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('chat.title')} />
      <div className="max-w-4xl mx-auto w-full px-4 pb-4">
        {/* Chat header */}
        <div
          className="flex justify-between items-center py-4 sticky z-10 bg-background/95 backdrop-blur-sm border-b border-border/50"
          style={{ top: 'calc(env(safe-area-inset-top) + var(--nav-height, 108px))' }}
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--icon-tint))] to-[hsl(var(--family-celebration))] bg-clip-text text-transparent">
            {t('chat.title')}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => gateAsync(() => clearChat())}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('chat.clearChat')}
          </Button>
        </div>

        {/* Messages — outer touch-capture container */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="overflow-hidden"
        >
          {/* Inner wrapper slides left to reveal timestamps */}
          <div
            className="space-y-4"
            style={{
              transform: `translateX(-${swipeOffset}px)`,
              transition: isSwiping.current ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {t('chat.noMessages')}
              </div>
            ) : (
              messages.map(msg => {
                const isMine = msg.userId === user.id;
                return (
                  <div key={msg.id} className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground pl-1">
                      {msg.userDisplayName}
                    </div>
                    <div className={`relative flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isMine
                          ? 'bg-gradient-to-br from-primary to-[hsl(var(--icon-tint))] text-primary-foreground shadow-md'
                          : 'bg-muted'
                      }`}>
                        <div className="text-sm">{msg.content}</div>
                      </div>
                      <div
                        className="absolute right-[-72px] top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none"
                        style={{
                          opacity: Math.min(swipeOffset / 40, 1),
                          transition: isSwiping.current ? 'none' : 'opacity 0.3s ease-out',
                        }}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="sticky bottom-0 flex gap-2 py-4 border-t bg-background">
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
      </div>
    </div>
  );
}
