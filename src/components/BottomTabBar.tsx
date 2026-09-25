import React from 'react';
import { 
  Home, 
  CheckSquare, 
  CreditCard, 
  PiggyBank,
  BarChart3, 
  Plus 
} from 'lucide-react';
import { triggerHaptic } from '../hooks/useFinanceStore';

export type TabId = 'today' | 'fixed' | 'cards' | 'savings' | 'analysis';

interface BottomTabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenQuickExpense: () => void;
  pendingFixedCount: number;
  hasCardAlert: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickExpense,
  pendingFixedCount,
  hasCardAlert,
}) => {
  const tabs = [
    {
      id: 'today' as TabId,
      label: 'Hoy',
      icon: Home,
      badge: null,
    },
    {
      id: 'fixed' as TabId,
      label: 'Fijos',
      icon: CheckSquare,
      badge: pendingFixedCount > 0 ? pendingFixedCount : null,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'cards' as TabId,
      label: 'Tarjetas',
      icon: CreditCard,
      badge: hasCardAlert ? '!' : null,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'savings' as TabId,
      label: 'Ahorro',
      icon: PiggyBank,
      badge: null,
    },
    {
      id: 'analysis' as TabId,
      label: 'Análisis',
      icon: BarChart3,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 pb-safe transition-all">
      <div className="max-w-lg mx-auto px-3 h-16 flex items-center justify-around relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                onSelectTab(tab.id);
              }}
              className={`ios-active relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative">
                <IconComponent 
                  size={21} 
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} 
                />

                {tab.badge && (
                  <span className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full ${tab.badgeColor || 'bg-emerald-500'} text-slate-950 text-[10px] font-extrabold flex items-center justify-center shadow-sm`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[76px] ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                {tab.label}
              </span>

              {/* Active Indicator dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
