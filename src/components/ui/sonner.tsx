import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // Sonner supports styling by toast type; keep it on-brand (Gamehaus warm neon).
          success:
            "group-[.toaster]:border-primary/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-primary/15 group-[.toaster]:via-card/95 group-[.toaster]:to-secondary/10",
          error:
            "group-[.toaster]:border-destructive/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-destructive/15 group-[.toaster]:via-card/95 group-[.toaster]:to-destructive/10",
          warning:
            "group-[.toaster]:border-secondary/35 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-secondary/15 group-[.toaster]:via-card/95 group-[.toaster]:to-secondary/10",
          info:
            "group-[.toaster]:border-border/60 group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-primary/10 group-[.toaster]:via-card/95 group-[.toaster]:to-secondary/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
