
import React, { useState, useEffect, useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getStoredAvatars, saveAvatar } from '@/utils/avatarStorage';

interface ProfileAvatarProps {
  employeeId: string;
  initials: string;
  className?: string;
  editable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onImageUpdate?: (dataUrl: string) => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  employeeId, 
  initials, 
  className, 
  editable = true,
  size = 'md',
  onImageUpdate
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const avatars = getStoredAvatars();
    if (avatars[employeeId]) {
      setAvatarUrl(avatars[employeeId]);
    }

    const handleUpdate = (e: any) => {
      if (e.detail.employeeId === employeeId) {
        setAvatarUrl(e.detail.dataUrl);
      }
    };

    window.addEventListener('avatar_updated', handleUpdate);
    return () => window.removeEventListener('avatar_updated', handleUpdate);
  }, [employeeId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        saveAvatar(employeeId, result);
        if (onImageUpdate) onImageUpdate(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (editable) {
      e.stopPropagation(); // Prevent card navigation
      fileInputRef.current?.click();
    }
  };

  const sizeClasses = {
    sm: 'w-10 h-10 text-xs rounded-xl',
    md: 'w-12 h-12 text-lg rounded-2xl',
    lg: 'w-24 h-24 text-2xl rounded-3xl',
    xl: 'w-40 h-40 text-5xl rounded-[2.5rem]'
  };

  return (
    <div 
      onClick={handleClick}
      data-employee-id={employeeId}
      className={cn(
        "relative flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 overflow-hidden group transition-all duration-300",
        editable && "cursor-pointer hover:border-indigo-500/50",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-indigo-400 select-none">{initials}</span>
      )}

      {editable && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className={cn("text-white", size === 'xl' ? 'w-8 h-8' : 'w-4 h-4')} />
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};
