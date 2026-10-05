import React from 'react';
import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  className?: string;
  size?: number;
  color?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name = 'Wrench',
  className = '',
  size = 20,
  color,
}) => {
  // @ts-ignore
  const IconComponent = Icons[name] || Icons.Wrench;
  return <IconComponent className={className} size={size} style={color ? { color } : undefined} />;
};
