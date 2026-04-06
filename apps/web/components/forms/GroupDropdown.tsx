'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MdFolder, MdFlight, MdHome, MdCelebration, MdWork, MdSchool, MdShoppingBag, MdFavorite, MdClose } from 'react-icons/md';

const GROUP_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  folder: MdFolder,
  travel: MdFlight,
  home: MdHome,
  celebration: MdCelebration,
  work: MdWork,
  school: MdSchool,
  shopping: MdShoppingBag,
  health: MdFavorite,
};

interface GroupOption {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface GroupDropdownProps {
  userId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function GroupDropdown({ userId, selectedId, onSelect }: GroupDropdownProps) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/groups?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setGroups(data.data || []))
      .catch(() => {});
  }, [userId]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch('');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  if (groups.length === 0) {
    return (
      <div>
        <label className="block text-sm text-text-secondary font-medium mb-2">
          그룹 <span className="text-text-muted font-normal">(선택)</span>
        </label>
        <div className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] py-3.5 px-4">
          <span className="text-sm text-text-muted">/groups 에서 그룹을 먼저 만들어주세요</span>
        </div>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.id === selectedId);
  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const handleSelect = (groupId: string) => {
    onSelect(groupId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef}>
      <label className="block text-sm text-text-secondary font-medium mb-2">
        그룹 <span className="text-text-muted font-normal">(선택)</span>
      </label>
      <div className="relative">
        <div
          className="w-full bg-bg-secondary border border-[var(--border)] rounded-[12px] text-text-primary focus-within:border-accent-mint transition-colors flex items-center py-3.5 px-4"
        >
          {selectedGroup && !isOpen && (() => {
            const IconComponent = GROUP_ICON_MAP[selectedGroup.icon || 'folder'] || MdFolder;
            return (
              <span className="mr-2" style={{ color: selectedGroup.color || '#6366F1' }}>
                <IconComponent />
              </span>
            );
          })()}
          <input
            type="text"
            placeholder={selectedGroup ? '' : '그룹 검색 또는 선택'}
            value={isOpen ? search : (selectedGroup?.name || '')}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="flex-1 bg-transparent outline-none text-text-primary placeholder:text-text-muted"
          />
          {selectedGroup && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              <MdClose className="text-base" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (isOpen) setSearch('');
            }}
            className="ml-1 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-[var(--border)] rounded-[12px] overflow-y-auto z-10 shadow-2xl max-h-60">
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => {
                const IconComponent = GROUP_ICON_MAP[group.icon || 'folder'] || MdFolder;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelect(group.id)}
                    className={`w-full text-left hover:bg-bg-card-hover transition-colors border-b border-[var(--border)] last:border-b-0 cursor-pointer flex items-center gap-3 py-3 px-4 text-[15px] ${
                      selectedId === group.id ? 'bg-bg-card-hover' : 'text-text-primary'
                    }`}
                  >
                    <span style={{ color: group.color || '#6366F1' }}><IconComponent /></span>
                    <span>{group.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="text-text-muted text-center py-3 px-4 text-sm">
                일치하는 그룹이 없습니다
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
