import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTheme } from '@/contexts/ThemeContext';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeSelector = () => {
  const { t } = useTranslation();
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div className="flex flex-col items-start gap-1">
              <Label className="cursor-pointer">{t('personal.selectTheme')}</Label>
              <span className="text-sm text-muted-foreground font-normal">{t(currentTheme.name)}</span>
            </div>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableThemes.map((theme) => (
          <Card
            key={theme.id}
            className={cn(
              'relative cursor-pointer transition-all hover:shadow-md',
              currentTheme.id === theme.id && 'ring-2 ring-primary'
            )}
            onClick={() => setTheme(theme.id)}
          >
            <div className="p-4">
              {/* Theme Preview Colors */}
              <div className="flex gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: `hsl(${theme.colors.light.primary})` }}
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: `hsl(${theme.colors.light.secondary})` }}
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: `hsl(${theme.colors.light.familyWarm})` }}
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-border"
                  style={{ backgroundColor: `hsl(${theme.colors.light.familyCelebration})` }}
                />
              </div>

              {/* Theme Name and Emotion */}
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">{t(theme.name)}</h3>
                <p className="text-xs text-muted-foreground">{t(theme.emotion)}</p>
              </div>

              {/* Selected Indicator */}
              {currentTheme.id === theme.id && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
