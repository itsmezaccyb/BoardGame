'use client';

interface ChameleonGridProps {
  items: string[];
  mode: 'word' | 'image';
  size?: number;
}

export default function ChameleonGrid({ items, mode, size = 150 }: ChameleonGridProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Loading game board...</p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${size}px)`,
        gap: '16px',
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '8px',
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-3 flex items-center justify-center cursor-default hover:bg-yellow-200 transition-colors"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            minWidth: `${size}px`,
          }}
        >
          {mode === 'word' ? (
            <p className="text-center font-semibold text-gray-800 text-sm line-clamp-3">
              {item}
            </p>
          ) : (
            <img
              src={item}
              alt="grid item"
              className="w-full h-full object-cover rounded"
              loading="lazy"
            />
          )}
        </div>
      ))}
    </div>
  );
}
