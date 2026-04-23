import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-200 opacity-40 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-indigo-300 opacity-30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="hidden flex-col justify-center lg:flex">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Prototype
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900">
              One workspace for your
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-indigo-500 bg-clip-text text-transparent">
                solar sales team.
              </span>
            </h2>
            <p className="mt-4 max-w-md text-slate-600">
              Replace the Excel back-and-forth. Consultants log installs,
              upgrades, and consultations; admins verify, set commissions, and
              pay. Unpaid items roll to the next Friday cycle automatically.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-slate-700">
              <Feature>No more copy-pasting between sheets</Feature>
              <Feature>Live updates across personnel and admin views</Feature>
              <Feature>Commissions editable per entry — rate auto-adjusts</Feature>
              <Feature>Friday-to-Friday billing with auto rollover + reason</Feature>
            </ul>
          </div>

          <div className="flex items-center">
            <div className="w-full max-w-md">
              <div className="card p-8">
                <h1 className="text-xl font-semibold text-slate-900">
                  Sign in to your workspace
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Use the credentials from your admin.
                </p>
                <div className="mt-6">
                  <LoginForm />
                </div>
              </div>
              <DemoCredentials />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      {children}
    </li>
  );
}

function DemoCredentials() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-600">
      <div className="mb-2 font-semibold text-slate-700">Demo accounts</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">
            Admin
          </div>
          <div className="font-mono text-slate-700">admin / admin123</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400">
            Personnel
          </div>
          <div className="font-mono text-slate-700">maria / personnel123</div>
        </div>
      </div>
    </div>
  );
}
