'use client';

import Image from 'next/image';
import { inchesToPixels } from '@/lib/dimensions';
import { GameSettingsPanel } from '@/components/GameSettingsPanel';
import { getImageUrl } from '@/lib/image-mapping';

export default function TicketToRidePage() {
  const width = inchesToPixels(31); // 31 inches wide
  const height = inchesToPixels(20.75); // 20.75 inches tall

  return (
    <main className="h-screen w-screen bg-white flex items-center justify-center overflow-hidden">
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: 'relative',
        }}
      >
        <Image
          src={getImageUrl('/images/ticket_to_ride.jpg')}
          alt="Ticket to Ride"
          fill
          style={{
            objectFit: 'contain',
          }}
          priority
          unoptimized
        />
      </div>
      <GameSettingsPanel />
    </main>
  );
}

