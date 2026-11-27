import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface PublicBreadcrumbItem {
  label: string;
  to?: string;
}

interface PublicPageShellProps {
  children: ReactNode;
  breadcrumbs?: PublicBreadcrumbItem[];
  mainClassName?: string;
  wrapperClassName?: string;
  breadcrumbContainerClassName?: string;
}

/**
 * Shared public-route layout wrapper providing Header, landmark `<main id="main-content">`,
 * optional accessible breadcrumbs, and Footer.
 */
export function PublicPageShell({
  children,
  breadcrumbs,
  mainClassName,
  wrapperClassName,
  breadcrumbContainerClassName,
}: PublicPageShellProps) {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", wrapperClassName)}>
      <Header />
      <main id="main-content" tabIndex={-1} className={cn("flex-1 focus:outline-none", mainClassName)}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className={cn("container-custom pt-24 pb-2", breadcrumbContainerClassName)}>
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <Fragment key={`${crumb.label}-${index}`}>
                      <BreadcrumbItem>
                        {isLast || !crumb.to ? (
                          <BreadcrumbPage className="max-w-[240px] truncate">{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.to}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default PublicPageShell;
