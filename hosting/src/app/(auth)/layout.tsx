import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            style={{ filter: "drop-shadow(0 0 6px rgba(108, 99, 255, 0.4))" }}
          >
            <circle cx="14" cy="14" r="11" className="fill-brand" />
          </svg>
          <span className="text-2xl font-extrabold tracking-tight text-brand">
            Solon
          </span>
        </Link>
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
