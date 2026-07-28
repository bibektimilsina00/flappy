interface NavSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
}

export function NavSection({ title, action, children, collapsed }: NavSectionProps) {
  return (
    <div className="mt-5">
      {collapsed ? (
        <div className="mx-2 mb-1 border-t border-border" />
      ) : (
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-medium text-muted-foreground/70">{title}</span>
          {action}
        </div>
      )}
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}
