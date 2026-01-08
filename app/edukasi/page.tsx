import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RecycleIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "@/components/icons"

const plasticCategories = [
  {
    code: "1",
    name: "PET (Polyethylene Terephthalate)",
    examples: "Water bottles, soda bottles, food containers",
    recyclable: true,
    risk: "Medium",
    decomposition: "450+ years",
    tips: "Don't reuse for hot food. Can be recycled into textile fibers.",
  },
  {
    code: "2",
    name: "HDPE (High-Density Polyethylene)",
    examples: "Milk bottles, detergent bottles, shopping bags",
    recyclable: true,
    risk: "Low",
    decomposition: "100+ years",
    tips: "Relatively safe for food. Better choice for daily use.",
  },
  {
    code: "3",
    name: "PVC (Polyvinyl Chloride)",
    examples: "Pipes, toys, blister packaging",
    recyclable: false,
    risk: "High",
    decomposition: "450+ years",
    tips: "Avoid for food. Contains chlorine and can release harmful dioxins.",
  },
  {
    code: "4",
    name: "LDPE (Low-Density Polyethylene)",
    examples: "Plastic bags, plastic wrap, squeeze bottles",
    recyclable: true,
    risk: "Low",
    decomposition: "500+ years",
    tips: "Relatively safe but difficult to recycle. Reuse as much as possible.",
  },
  {
    code: "5",
    name: "PP (Polypropylene)",
    examples: "Yogurt containers, straws, bottle caps",
    recyclable: true,
    risk: "Low",
    decomposition: "20-30 years",
    tips: "Best choice for food containers. Heat-resistant and microwave-safe.",
  },
  {
    code: "6",
    name: "PS (Polystyrene)",
    examples: "Styrofoam, disposable plastic cups, takeaway food containers",
    recyclable: false,
    risk: "High",
    decomposition: "500+ years",
    tips: "Highly dangerous! Avoid for hot food. Easily breaks down into microplastics.",
  },
  {
    code: "7",
    name: "Other (Mixed)",
    examples: "Water dispensers, baby bottles, CDs/DVDs",
    recyclable: false,
    risk: "Medium-High",
    decomposition: "Varies",
    tips: "Be careful with BPA. Choose BPA-Free if you must use.",
  },
]

const generalTips = [
  {
    title: "Reduce",
    description: "Minimize single-use plastic. Bring your own shopping bags and water bottles.",
    icon: AlertTriangleIcon,
  },
  {
    title: "Reuse",
    description: "Use plastic containers for other purposes before discarding them.",
    icon: CheckCircleIcon,
  },
  {
    title: "Recycle",
    description: "Separate plastic waste and send it to recycling centers or waste banks.",
    icon: RecycleIcon,
  },
]

function getRiskBadgeColor(risk: string) {
  switch (risk) {
    case "Low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    case "Medium":
    case "Medium-High":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "High":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function EducationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
                <InfoIcon className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground">Education Mode</h1>
            <p className="text-muted-foreground leading-relaxed">
              Learn about different types of plastic, their hazard levels, and how to manage them wisely to protect our
              environment.
            </p>
          </div>

          {/* 3R Tips */}
          <div className="mb-12 grid gap-4 md:grid-cols-3">
            {generalTips.map((tip) => {
              const Icon = tip.icon
              return (
                <Card key={tip.title} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Plastic Categories */}
          <div className="mb-8">
            <h2 className="mb-6 text-xl font-bold text-foreground">Plastic Categories</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plasticCategories.map((category) => (
                <Card key={category.code} className="overflow-hidden border-border/50">
                  <CardHeader className="bg-secondary/50 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
                          {category.code}
                        </div>
                        <CardTitle className="text-base leading-tight">{category.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Examples:</p>
                      <p className="text-sm text-foreground">{category.examples}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className={getRiskBadgeColor(category.risk)}>Risk: {category.risk}</Badge>
                      <Badge variant={category.recyclable ? "default" : "secondary"}>
                        {category.recyclable ? "Recyclable" : "Hard to Recycle"}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Decomposition Time:</p>
                      <p className="text-sm font-semibold text-foreground">{category.decomposition}</p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{category.tips}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Microplastic Section */}
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive">
                  <AlertTriangleIcon className="h-5 w-5 text-destructive-foreground" />
                </div>
                <CardTitle>Microplastic Hazards</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Microplastics are plastic particles smaller than 5mm formed from degradation of plastic waste. These
                particles have been found in drinking water, seafood, and even the air we breathe.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-card p-4">
                  <h4 className="mb-2 font-medium text-foreground">Health Impacts:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Disruption of endocrine system</li>
                    <li>• Chronic inflammation</li>
                    <li>• Potential carcinogenic effects</li>
                    <li>• Accumulation in body organs</li>
                  </ul>
                </div>

                <div className="rounded-lg bg-card p-4">
                  <h4 className="mb-2 font-medium text-foreground">How to Reduce Exposure:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Avoid plastic containers for hot food</li>
                    <li>• Use water filters</li>
                    <li>• Choose plastic-free products</li>
                    <li>• Reduce packaged food consumption</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
