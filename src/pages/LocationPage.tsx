import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Phone, Clock } from "lucide-react";

const locationData: Record<string, { name: string; description: string; areas: string[] }> = {
  "georgian-bay": {
    name: "Georgian Bay",
    description: "Serving the stunning Georgian Bay coastline with premium boat detailing, ceramic coatings, and marine restoration services.",
    areas: ["Midland", "Penetanguishene", "Wasaga Beach", "Collingwood", "Meaford"],
  },
  "muskoka": {
    name: "Muskoka",
    description: "Premium marine care throughout the Muskoka Lakes region — the heart of Ontario's cottage country.",
    areas: ["Bracebridge", "Gravenhurst", "Huntsville", "Port Carling", "Bala"],
  },
  "lake-simcoe": {
    name: "Lake Simcoe",
    description: "Complete boat detailing services for Lake Simcoe boaters, from Barrie to Orillia and beyond.",
    areas: ["Barrie", "Orillia", "Innisfil", "Keswick", "Beaverton"],
  },
  "midland": {
    name: "Midland",
    description: "Our home base. Full-service marine detailing right on the shores of Southern Georgian Bay.",
    areas: ["Midland Harbour", "Tay Township", "Tiny Township", "Waubaushene", "Victoria Harbour"],
  },
  "barrie": {
    name: "Barrie",
    description: "Serving Barrie and the surrounding Simcoe County with mobile marine detailing services.",
    areas: ["Barrie Waterfront", "Shanty Bay", "Oro-Medonte", "Springwater", "Innisfil"],
  },
};

const LocationPage = () => {
  const { slug } = useParams();
  const location = locationData[slug || ""] || locationData["georgian-bay"];

  return (
    <Layout>
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="animate-fade-up">
            <div className="flex items-center gap-2 text-primary font-medium tracking-widest uppercase text-sm mb-4">
              <MapPin className="h-4 w-4" /> Service Area
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Marine Detailing in <span className="text-gradient-cyan">{location.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">{location.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { icon: MapPin, label: "Mobile Service", desc: "We come to your dock or marina" },
                { icon: Phone, label: "Free Estimates", desc: "No-obligation quotes" },
                { icon: Clock, label: "Flexible Scheduling", desc: "Weekday & weekend availability" },
              ].map((item) => (
                <div key={item.label} className="p-5 rounded-xl border border-border/50 bg-card-gradient">
                  <item.icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-4">Areas We Serve</h2>
              <div className="flex flex-wrap gap-3">
                {location.areas.map((area) => (
                  <span key={area} className="px-4 py-2 rounded-full text-sm border border-border/50 bg-secondary text-secondary-foreground">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="hero" size="lg" asChild>
                <Link to="/quote">Get a Quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/booking">Book a Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LocationPage;
