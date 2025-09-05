import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useApp } from '@/hooks/useApp';
import { storage } from '@/lib/storage';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ChatPage() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeFamilyId) {
      const familyMessages = storage.getMessages(activeFamilyId);
      setMessages(familyMessages);
      
      // Update last read timestamp
      const now = new Date().toISOString();
      const userFamilies = storage.getUserFamilies();
      const userFamily = userFamilies.find(uf => uf.userId === user?.id && uf.familyId === activeFamilyId);
      if (userFamily) {
        storage.updateUserFamily(user!.id, activeFamilyId, {
          lastReadAt: now
        });
      }
    }
  }, [activeFamilyId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user || !activeFamilyId) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      familyId: activeFamilyId,
      userId: user.id,
      userDisplayName: user.displayName,
      content: message.trim(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    storage.addMessage(newMessage);
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Family Chat" />
      
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-80px)] flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Family Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[60vh]">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.userId === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.userId === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.userId !== user.id && (
                        <div className="text-xs font-medium mb-1">{msg.userDisplayName}</div>
                      )}
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {formatDate(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
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