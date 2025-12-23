import Link from 'next/link';

export default function Home() {
    return (
        <main className="h-screen w-screen bg-white flex flex-col items-center justify-start pt-16 overflow-hidden">
            <h1 className="text-6xl font-bold text-gray-900 mb-16">Games</h1>

            <div className="grid grid-cols-2 gap-8 max-w-4xl">
                <Link
                    href="/chess"
                    className="flex flex-col items-center justify-center p-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer border-2 border-gray-300 hover:border-gray-400"
                >
                    <div className="text-4xl mb-4">♟️</div>
                    <span className="text-2xl font-semibold text-gray-800">Chess</span>
                </Link>
                <Link
                    href="/ticket-to-ride"
                    className="flex flex-col items-center justify-center p-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer border-2 border-gray-300 hover:border-gray-400"
                >
                    <div className="text-4xl mb-4">🚂</div>
                    <span className="text-2xl font-semibold text-gray-800">Ticket to Ride</span>
                </Link>
                <Link
                    href="/catan"
                    className="flex flex-col items-center justify-center p-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer border-2 border-gray-300 hover:border-gray-400"
                >
                    <div className="text-4xl mb-4">🏝️</div>
                    <span className="text-2xl font-semibold text-gray-800">Catan</span>
                </Link>
                <Link
                    href="/codenames"
                    className="flex flex-col items-center justify-center p-8 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer border-2 border-gray-300 hover:border-gray-400"
                >
                    <div className="text-4xl mb-4">🕵️</div>
                    <span className="text-2xl font-semibold text-gray-800">Codenames</span>
                </Link>
            </div>
        </main>
    );
}

