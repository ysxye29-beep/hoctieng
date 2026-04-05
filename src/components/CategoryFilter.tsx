import { useState } from 'react';
import { useLanguageStore } from '../store/languageStore';

export default function CategoryFilter() {
  const { config } = useLanguageStore();
  const [activeId, setActiveId] = useState('all');

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide w-full mb-8">
      {config.categories.map((category) => (
        <button
          key={category.id}
          onClick={() => setActiveId(category.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeId === category.id
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : 'bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          <span className="text-lg leading-none">{category.icon}</span>
          {category.label}
        </button>
      ))}
    </div>
  );
}
