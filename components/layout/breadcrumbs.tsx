"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = { label: string; href?: string };

type BreadcrumbStore = {
  override: Crumb[] | null;
  setOverride: (crumbs: Crumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbStore | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/**
 * Rendered by pages that know more about the current record than the URL does
 * (a page title, a project name). Falls back to the derived trail when absent.
 */
export function SetBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const store = useContext(BreadcrumbContext);
  const key = JSON.stringify(crumbs);

  useEffect(() => {
    store?.setOverride(JSON.parse(key) as Crumb[]);
    return () => store?.setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

const SEGMENT_LABELS: Record<string, string> = {
  pages: "Documents",
  projects: "Projects",
  tasks: "Tasks",
  databases: "Databases",
  settings: "Settings",
  notifications: "Notifications",
  trash: "Trash",
};

function deriveCrumbs(pathname: string, workspaceName: string): Crumb[] {
  // /w/<slug>/<section>/<id>
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[1];
  if (!slug) return [];

  const crumbs: Crumb[] = [{ label: workspaceName, href: `/w/${slug}` }];
  const section = parts[2];
  if (!section) return crumbs;

  crumbs.push({
    label: SEGMENT_LABELS[section] ?? section,
    href: `/w/${slug}/${section}`,
  });

  if (parts[3]) crumbs.push({ label: "…" });
  return crumbs;
}

export function AppBreadcrumbs({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const store = useContext(BreadcrumbContext);
  const derived = deriveCrumbs(pathname, workspaceName);
  const crumbs = store?.override ?? derived;

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <BreadcrumbItem key={`${crumb.label}-${index}`} className="min-w-0">
              {isLast || !crumb.href ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                  <BreadcrumbSeparator className="ml-1" />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
