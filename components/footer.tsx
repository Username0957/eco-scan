import { LeafIcon, HeartIcon } from "@/components/icons"

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <LeafIcon className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Plastigram</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Dibuat dengan</span>
            <HeartIcon className="h-4 w-4 text-primary" />
            <span>untuk bumi yang lebih baik</span>
          </div>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Plastigram. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  )
}
