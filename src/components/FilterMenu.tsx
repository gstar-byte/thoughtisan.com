import React from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { motion } from 'motion/react';

interface FilterMenuProps {
  filter: string;
  setFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
}

export function FilterMenu({
  filter,
  setFilter,
  categoryFilter,
  setCategoryFilter,
  tagFilter,
  setTagFilter,
}: FilterMenuProps) {
  const [open, setOpen] = React.useState(false);

  const toggleOpen = () => setOpen(!open);

  // Placeholder options – replace with real categories/tags as needed
  const categories = ['All', 'Work', 'Personal', 'Ideas'];
  const tags = ['#todo', '#idea', '#project'];

  return (
    <div className="filter-menu hidden sm:flex items-center gap-2">
      <button
        onClick={toggleOpen}
        className="flex items-center gap-1 px-3 py-1 bg-white/5 backdrop-blur-md rounded-md border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Filter size={16} className="text-white/70" />
        <span className="text-sm text-white/70">{filter || 'Filter'}</span>
        <ChevronDown size={14} className={`text-white/70 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute mt-2 py-2 bg-white/5 backdrop-blur-md rounded-md border border-white/10 shadow-lg min-w-[200px]"
        >
          <div className="px-4 py-2">
            <p className="text-xs text-white/50 mb-1">Category</p>
            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => { setCategoryFilter(c); setFilter(c); setOpen(false); }}
                  className={`px-2 py-1 rounded text-sm ${categoryFilter === c ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-white/70 hover:bg-white/10'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 border-t border-white/10">
            <p className="text-xs text-white/50 mb-1">Tag</p>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTagFilter(t); setFilter(t); setOpen(false); }}
                  className={`px-2 py-1 rounded text-sm ${tagFilter === t ? 'bg-[#007AFF]/20 text-[#007AFF]' : 'text-white/70 hover:bg-white/10'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
