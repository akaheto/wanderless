import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/roles";
import { signOutAction } from "@/app/actions";
import { ClientNavLinks } from "./ClientNavLinks";

export async function NavLinks() {
  const user = await getCurrentUser();
  const userIsAdmin = user ? await isAdmin() : false;

  return (
    <>
      <ClientNavLinks showAdminLinks={userIsAdmin} />
      <div className="border-t border-line px-3 py-4 lg:mt-4">
        {user ? (
          <div className="space-y-2">
            <div className="text-[12px] text-ink-3">Signed in as</div>
            <div className="break-all text-[13px] font-medium text-ink-2">{user.email}</div>
            <form action={signOutAction} className="pt-2">
              <button
                type="submit"
                className="text-[13px] text-ink-3 hover:text-ink-2"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 rounded px-2 py-1.5 text-center text-[12px] text-ink-2 hover:bg-surface-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex-1 rounded bg-accent-soft px-2 py-1.5 text-center text-[12px] font-medium text-accent hover:bg-accent-soft/80"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
