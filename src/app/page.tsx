import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">ClickUp to Monday.com Sync</h1>
          <p className="text-xl text-gray-600">
            Synchronize files and replicate entire lists between platforms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/auth"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Connect Services{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Authenticate with ClickUp and Monday.com to get started
            </p>
          </Link>

          <Link
            href="/sync"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              File Sync{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Transfer attachments from ClickUp tasks to Monday items
            </p>
          </Link>

          <Link
            href="/replicate"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              List Replication{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Create new Monday boards from ClickUp lists with complete data
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Dashboard{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              View job history and monitor sync progress
            </p>
          </Link>
        </div>

        <div className="text-center mt-12">
          <h3 className="text-lg font-semibold mb-4">Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="font-semibold mb-1">File Transfer</div>
              <div className="text-gray-600">Bulk attachment sync</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="font-semibold mb-1">Field Mapping</div>
              <div className="text-gray-600">Intelligent type conversion</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="font-semibold mb-1">Duplicate Detection</div>
              <div className="text-gray-600">Skip existing files</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="font-semibold mb-1">Progress Tracking</div>
              <div className="text-gray-600">Real-time updates</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
