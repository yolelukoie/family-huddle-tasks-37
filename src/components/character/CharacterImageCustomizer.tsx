import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCustomCharacterImages } from '@/hooks/useCustomCharacterImages';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { getStageName, getCharacterImagePath, getCurrentStage } from '@/lib/character';
import { useToast } from '@/hooks/use-toast';
import { Upload, RotateCcw, Loader2, ImageIcon, ChevronDown, Star } from 'lucide-react';

export function CharacterImageCustomizer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeFamilyId, getTotalStars } = useApp();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const {
    allStages,
    isLoading,
    isUploading,
    hasCustomImage,
    getCustomImageUrl,
    uploadCustomImage,
    deleteCustomImage,
  } = useCustomCharacterImages();

  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleUploadClick = (stage: number) => {
    fileInputRefs.current[stage]?.click();
  };

  const handleFileChange = async (stage: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('personal.invalidFileType'),
        description: t('personal.invalidFileTypeDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('personal.fileTooLarge'),
        description: t('personal.fileTooLargeDesc'),
        variant: 'destructive',
      });
      return;
    }

    const success = await uploadCustomImage(stage, file);
    
    if (success) {
      toast({
        title: t('personal.customImageUploaded'),
        description: t('personal.customImageUploadedDesc'),
      });
    } else {
      toast({
        title: t('personal.uploadFailed'),
        description: t('personal.uploadFailedDesc'),
        variant: 'destructive',
      });
    }

    if (fileInputRefs.current[stage]) {
      fileInputRefs.current[stage]!.value = '';
    }
  };

  const handleResetToDefault = async (stage: number) => {
    const success = await deleteCustomImage(stage);
    
    if (success) {
      toast({
        title: t('personal.customImageReset'),
        description: t('personal.customImageResetDesc'),
      });
    } else {
      toast({
        title: t('personal.resetFailed'),
        description: t('personal.resetFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  const gender = user.gender as 'male' | 'female' | 'other';
  const totalStars = activeFamilyId ? getTotalStars(activeFamilyId) : 0;
  const userCurrentStage = getCurrentStage(totalStars);

  // Filter out Elder stage (1000) - it shows a celebration instead
  const editableStages = allStages.filter(stage => stage.stage !== 1000);

  const getStageImagePath = (stage: number) => {
    const customUrl = getCustomImageUrl(stage);
    return getCharacterImagePath(gender, stage, customUrl);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {t('personal.customizeCharacter')}
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('personal.customizeCharacterDesc')}
            </p>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {editableStages.map((stageData) => {
                  const imagePath = getStageImagePath(stageData.stage);
                  const hasCustom = hasCustomImage(stageData.stage);
                  const isUploadingThis = isUploading === stageData.stage;
                  const isCurrentStage = stageData.stage === userCurrentStage;

                  return (
                    <div 
                      key={stageData.stage} 
                      className={`flex flex-col items-center gap-2 p-2 rounded-lg border bg-card ${
                        isCurrentStage 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border'
                      }`}
                    >
                      {/* Stage image */}
                      <div className="relative w-16 h-16">
                        <img
                          src={imagePath}
                          alt={getStageName(stageData.stage)}
                          className="w-full h-full object-contain rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('stage_000')) {
                              target.src = getCharacterImagePath(gender, 0);
                            }
                          }}
                        />
                        {hasCustom && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                        )}
                        {isUploadingThis && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Stage name + stars required */}
                      <div className="flex flex-col items-center gap-0.5 w-full">
                        <span className="text-xs font-medium text-center truncate w-full">
                          {getStageName(stageData.stage)}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Star className="h-2.5 w-2.5" />
                          {stageData.requiredStars}
                        </span>
                        {isCurrentStage && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">
                            {t('personal.currentStage')}
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <input
                          ref={(el) => { fileInputRefs.current[stageData.stage] = el; }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(stageData.stage, e)}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleUploadClick(stageData.stage)}
                          disabled={isUploadingThis}
                        >
                          <Upload className="h-3 w-3" />
                        </Button>
                        {hasCustom && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleResetToDefault(stageData.stage)}
                            disabled={isUploadingThis}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
