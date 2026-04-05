import React from 'react'

interface SegmentModalProps {
  total: number
  from: number
  to: number
  onFromChange: (val: number) => void
  onToChange: (val: number) => void
  onConfirm: () => void
  onCancel: () => void
}

export function SegmentModal({
  total,
  from,
  to,
  onFromChange,
  onToChange,
  onConfirm,
  onCancel
}: SegmentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-72 shadow-2xl">
        <h3 className="text-white font-semibold mb-1">Chọn đoạn luyện tập</h3>
        <p className="text-zinc-400 text-xs mb-4">Tổng {total} câu</p>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Từ câu</label>
            <input
              type="number"
              min={1}
              max={total}
              value={from}
              onChange={e => onFromChange(Math.max(1, Math.min(total, Number(e.target.value))))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-zinc-500 mt-5">-</span>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Đến câu</label>
            <input
              type="number"
              min={1}
              max={total}
              value={to}
              onChange={e => onToChange(Math.max(1, Math.min(total, Number(e.target.value))))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm}
            disabled={from > to}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}
