import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { Bell } from "lucide-react"

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
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:shadow-primary/10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      icons={{
        info: <Bell className="h-4 w-4 text-primary" />,
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
