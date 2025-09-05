import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, CheckSquare, Target, MessageCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

interface NavigationHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function NavigationHeader({ title, showBackButton = true }: NavigationHeaderProps) {
  const navigate = useNavigate();

  const navigationItems = [
    { icon: Home, label: 'Main', route: ROUTES.main },
    { icon: CheckSquare, label: 'Tasks', route: ROUTES.tasks },
    { icon: Target, label: 'Goals', route: ROUTES.goals },
    { icon: MessageCircle, label: 'Chat', route: ROUTES.chat },
    { icon: Users, label: 'Family', route: ROUTES.family },
  ];

  return (
    <div className="bg-white border-b border-border sticky top-0 z-10">
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
        </div>

        {/* Navigation Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {navigationItems.map(({ icon: Icon, label, route }) => (
            <Button
              key={route}
              variant={window.location.pathname === route ? "default" : "outline"}
              size="sm"
              onClick={() => navigate(route)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}