import React from 'react';
import { 
  ShoppingCart, 
  Utensils, 
  Fuel, 
  Car, 
  HeartPulse, 
  Zap, 
  Home, 
  Film, 
  ShoppingBag, 
  MoreHorizontal,
  CircleDollarSign,
  CreditCard as CreditCardIcon
} from 'lucide-react';
import { CategoryId, CATEGORIES } from '../types/finance';

interface CategoryIconProps {
  categoryId?: CategoryId;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  categoryId = 'otros', 
  size = 18, 
  className = '' 
}) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const iconName = cat?.iconName;

  switch (iconName) {
    case 'ShoppingCart':
      return <ShoppingCart size={size} className={className} />;
    case 'Utensils':
      return <Utensils size={size} className={className} />;
    case 'Fuel':
      return <Fuel size={size} className={className} />;
    case 'Car':
      return <Car size={size} className={className} />;
    case 'HeartPulse':
      return <HeartPulse size={size} className={className} />;
    case 'Zap':
      return <Zap size={size} className={className} />;
    case 'Home':
      return <Home size={size} className={className} />;
    case 'Film':
      return <Film size={size} className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag size={size} className={className} />;
    case 'MoreHorizontal':
    default:
      return <MoreHorizontal size={size} className={className} />;
  }
};

export const CategoryBadge: React.FC<{ categoryId: CategoryId; showLabel?: boolean }> = ({ 
  categoryId, 
  showLabel = true 
}) => {
  const cat = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <span 
      className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 text-[11px] font-medium rounded-full shrink-0"
      style={{ backgroundColor: cat.bgLight, color: cat.color }}
    >
      <CategoryIcon categoryId={categoryId} size={13} />
      {showLabel && <span>{cat.label}</span>}
    </span>
  );
};
