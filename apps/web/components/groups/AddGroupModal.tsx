'use client';

import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { MdFolder, MdFlight, MdHome, MdCelebration, MdWork, MdSchool, MdShoppingBag, MdFavorite } from 'react-icons/md';

const ICON_OPTIONS = [
  { key: 'folder', icon: MdFolder, label: '기본' },
  { key: 'travel', icon: MdFlight, label: '여행' },
  { key: 'home', icon: MdHome, label: '집' },
  { key: 'celebration', icon: MdCelebration, label: '행사' },
  { key: 'work', icon: MdWork, label: '업무' },
  { key: 'school', icon: MdSchool, label: '학교' },
  { key: 'shopping', icon: MdShoppingBag, label: '쇼핑' },
  { key: 'health', icon: MdFavorite, label: '건강' },
];

const COLOR_OPTIONS = [
  '#6366F1', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4',
];

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; description?: string; icon?: string; color?: string }) => void;
}

export default function AddGroupModal({ isOpen, onClose, onAdd }: AddGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#6366F1');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-card border border-[var(--border)] rounded-[20px] w-full max-w-md p-6 animate-[fadeInUp_0.3s_ease-out]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">새 그룹 만들기</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary cursor-pointer">
            <FaTimes />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* 이름 */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">그룹 이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 제주도 여행"
              className="w-full bg-bg-secondary border border-[var(--border)] rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              maxLength={30}
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">설명 (선택)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 2026년 4월 3박4일"
              className="w-full bg-bg-secondary border border-[var(--border)] rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
              maxLength={50}
            />
          </div>

          {/* 아이콘 */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">아이콘</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {ICON_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelectedIcon(opt.key)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                      selectedIcon === opt.key
                        ? 'bg-accent-blue/20 ring-2 ring-accent-blue'
                        : 'bg-bg-secondary hover:bg-bg-card-hover'
                    }`}
                    title={opt.label}
                  >
                    <Icon className="text-lg" style={{ color: selectedColor }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 색상 */}
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">색상</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-bg-card' : ''
                  }`}
                  style={{ backgroundColor: color, ...(selectedColor === color ? { ringColor: color } : {}) }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-bg-secondary text-text-secondary text-sm font-medium cursor-pointer hover:bg-bg-card-hover transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-accent-blue text-white text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
