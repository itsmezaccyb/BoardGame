'use client';

import React from 'react';
import { getBuildingsForVariant, getResourceLogo, BuildingCost, COMMODITY_COLORS, COMMODITY_LABELS } from '@/lib/building-costs';
import { getImageUrl } from '@/lib/image-mapping';

interface BuildingCostsLegendProps {
  expansion: string;
  citiesAndKnights: boolean;
  position: 'bottom-left' | 'top-right';
  tileStyle?: string;
}

export function BuildingCostsLegend({
  expansion,
  citiesAndKnights,
  position,
  tileStyle = 'classic'
}: BuildingCostsLegendProps) {
  const buildings = getBuildingsForVariant(expansion, citiesAndKnights);
  const isRotated = position === 'top-right';

  // Determine if we need compact mode (Cities & Knights has many items)
  const isCompact = citiesAndKnights;

  return (
    <div
      style={{
        transform: isRotated ? 'rotate(180deg)' : undefined,
      }}
      className={`rounded-lg border-2 border-amber-800 bg-white/90 backdrop-blur-sm shadow-xl ${
        isCompact ? 'p-1.5' : 'p-2'
      }`}
    >
      {/* Title */}
      <div className={`text-amber-900 font-bold border-b border-amber-700 mb-2 pb-1 ${
        isCompact ? 'text-sm' : 'text-base'
      }`}>
        Building Costs
      </div>

      {/* Building rows */}
      <div className="flex flex-col gap-0.5">
        {buildings.map((building) => (
          <BuildingRow
            key={building.id}
            building={building}
            isCompact={isCompact}
            tileStyle={tileStyle}
          />
        ))}
      </div>
    </div>
  );
}

interface BuildingRowProps {
  building: BuildingCost;
  isCompact: boolean;
  tileStyle: string;
}

function BuildingRow({ building, isCompact, tileStyle }: BuildingRowProps) {
  const iconSize = isCompact ? 32 : 36;
  const textSize = isCompact ? 'text-xs' : 'text-sm';

  // Determine color based on commodity type
  let nameColor = 'text-gray-800';
  if (building.commodityType === 'science') {
    nameColor = 'text-green-600';
  } else if (building.commodityType === 'trade') {
    nameColor = 'text-yellow-600';
  } else if (building.commodityType === 'politics') {
    nameColor = 'text-blue-600';
  }

  return (
    <div className={`flex items-center gap-1.5 ${textSize}`}>
      {/* Building name */}
      <div className={`font-semibold ${nameColor} ${isCompact ? 'w-24' : 'w-32'} flex-shrink-0`}>
        {building.name}
      </div>

      {/* Resources */}
      <div className="flex items-center gap-0.5 flex-grow">
        {building.costs.map((cost, idx) => {
          const logo = getResourceLogo(cost.resource, tileStyle);
          return (
          <div key={`${cost.resource}-${idx}`} className="flex items-center gap-0">
              {logo ? (
                // Repeat resource icons based on amount
                Array.from({ length: cost.amount }).map((_, iconIdx) => (
                  <img
                    key={`${cost.resource}-icon-${iconIdx}`}
                    src={getImageUrl(logo)}
                    alt={cost.resource}
                    style={{ width: iconSize, height: iconSize }}
                    className="object-contain"
                  />
                ))
              ) : (
                // For commodities, show "1 x" followed by colored badges
                <>
                  <span className="text-gray-700 text-xs">
                    {cost.amount} x
                  </span>
                  <span
                    className={`px-1 py-0.5 rounded text-white text-xs font-semibold`}
                    style={{
                      backgroundColor: COMMODITY_COLORS[building.commodityType || 'science']
                    }}
                  >
                    {COMMODITY_LABELS[building.commodityType || 'science']}
                  </span>
                </>
              )}
          </div>
          );
        })}
      </div>

      {/* Victory Points */}
      <div className={`text-gray-600 ${isCompact ? 'w-12' : 'w-14'} text-right flex-shrink-0`}>
        {building.victoryPoints === -1 && building.showVPPerLevel
          ? 'per lvl'
          : building.victoryPoints === -1
          ? ''
          : `${building.victoryPoints}`
        }
      </div>
    </div>
  );
}
