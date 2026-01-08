import { Card, CardContent } from "@/components/ui/card"
import { ScanIcon, RecycleIcon, BookOpenIcon, BarChartIcon, ClockIcon, ShieldAlertIcon } from "@/components/icons"

const features = [
  {
    icon: ScanIcon,
    title: "Multi-Object Detection",
    description: "Identify various types of plastic waste simultaneously in a single photo",
  },
  {
    icon: ClockIcon,
    title: "Decomposition Time Estimate",
    description: "Find out how long plastic waste will take to decompose in nature",
  },
  {
    icon: ShieldAlertIcon,
    title: "Microplastic Risk",
    description: "Understand the hazard level of microplastics from each type of plastic",
  },
  {
    icon: RecycleIcon,
    title: "Eco-Friendly Alternatives",
    description: "Get recommendations for substitutes that are more eco-friendly",
  },
  {
    icon: BookOpenIcon,
    title: "Education Mode",
    description: "Learn about plastic categories and their impacts in depth",
  },
  {
    icon: BarChartIcon,
    title: "Environmental Statistics",
    description: "Track your contribution to Earth conservation",
  },
]

export function FeatureCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon
        return (
          <Card key={feature.title} className="border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
