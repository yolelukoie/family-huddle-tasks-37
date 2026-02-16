import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, CheckSquare, Target, MessageCircle, Users, LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavigationHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function NavigationHeader({ title, showBackButton = true }: NavigationHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

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
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(user as any)?.avatar_url} alt={user?.displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem 
                className="font-medium cursor-pointer"
                onClick={() => navigate(ROUTES.personal)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                  </div>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('common.logOut', 'Log out')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {navigationItems.map(({ icon: Icon, label, route }) => {
            const isActive = window.location.pathname === route;
            return (
              <Button
                key={route}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => navigate(route)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap transition-all",
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