import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useChat() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load messages for active family
  const loadMessages = useCallback(async () => {
    if (!user || !activeFamilyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('family_id', activeFamilyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const convertedMessages: ChatMessage[] = (data || []).map(msg => ({
        id: msg.id,
        familyId: msg.family_id,
        userId: msg.user_id,
        userDisplayName: user.id === msg.user_id ? user.displayName : 'Family Member',
        content: msg.content,
        timestamp: msg.created_at,
        createdAt: msg.created_at,
      }));

      setMessages(convertedMessages);
    } catch (error) {
      console.error('Error in loadMessages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeFamilyId]);

  // Load messages when family changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up realtime subscription
  useEffect(() => {
    if (!activeFamilyId) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `family_id=eq.${activeFamilyId}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          const convertedMessage: ChatMessage = {
            id: newMessage.id,
            familyId: newMessage.family_id,
            userId: newMessage.user_id,
            userDisplayName: newMessage.user_id === user?.id ? user.displayName : 'Family Member',
            content: newMessage.content,
            timestamp: newMessage.created_at,
            createdAt: newMessage.created_at,
          };
          
          setMessages(prev => [...prev, convertedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeFamilyId, user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !activeFamilyId || !content.trim()) return false;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          family_id: activeFamilyId,
          user_id: user.id,
          content: content.trim()
        }]);

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return false;
    }
  }, [user, activeFamilyId, toast]);

  const refreshMessages = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    sendMessage,
    refreshMessages,
  };
}