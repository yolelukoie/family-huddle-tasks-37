import { Button } from '@/components/ui/button';
import { Home, CheckSquare, Target, MessageCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useApp } from '@/hooks/useApp';
import { isBlocked, getBlockStatusText } from '@/lib/blockUtils';

interface NavigationHeaderProps {
  title: string;
}

export function NavigationHeader({ title }: NavigationHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { activeFamilyId, families, getUserFamily } = useApp();
  const activeFamily = activeFamilyId ? families.find(f => f.id === activeFamilyId) : null;
  const userMembership = activeFamilyId ? getUserFamily(activeFamilyId) : null;
  const userIsBlocked = isBlocked(userMembership);
  const displayTitle = activeFamily?.name
    ? (userIsBlocked ? `${activeFamily.name} — ${getBlockStatusText(userMembership, t)}` : activeFamily.name)
    : title;

  const navigationItems = [
    { icon: Home, label: t('nav.home'), route: ROUTES.main },
    { icon: CheckSquare, label: t('nav.tasks'), route: ROUTES.tasks },
    { icon: Target, label: t('nav.goals'), route: ROUTES.goals },
    { icon: MessageCircle, label: t('nav.chat'), route: ROUTES.chat },
    { icon: Users, label: t('nav.family'), route: ROUTES.family },
  ];

  return (
    <div className="bg-gradient-to-r from-[hsl(var(--gradient-start))]/30 to-[hsl(var(--gradient-end))]/30 border-b border-[hsl(var(--card-accent))]/20 sticky z-10 backdrop-blur-sm" style={{ top: 'env(safe-area-inset-top)' }}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">{displayTitle}</h1>
          </div>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full p-0"
            onClick={() => navigate(ROUTES.personal, { replace: true })}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url} alt={user?.displayName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>

        {/* Navigation Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {navigationItems.map(({ icon: Icon, label, route }) => {
            const isActive = window.location.pathname === route;
            return (
              <Button
                key={route}
                variant={isActive ? "default" : "outline"}
                onClick={() => navigate(route, { replace: true })}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap transition-all px-2.5 py-1.5 h-auto text-sm",
                  isActive && "shadow-md bg-gradient-to-br from-primary to-[hsl(var(--icon-tint))]"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}