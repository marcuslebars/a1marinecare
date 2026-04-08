import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import serviceDetailing from "@/assets/service-detailing.jpg";
import serviceCeramic from "@/assets/service-ceramic.jpg";
import serviceInterior from "@/assets/service-interior.jpg";

const serviceData: Record<string, { title: string; description: string; image: string; features: string[]; meta: string }> = {
  "boat-detailing": {
    title: "Boat Detailing",
    description: "Our comprehensive exterior detailing restores your vessel to showroom condition. From oxidation removal to high-gloss finishes, we bring back the brilliance.",
    image: serviceDetailing,
    features: ["Full exterior wash & decontamination", "Oxidation & stain removal", "Compound & polish", "High-gloss sealant application", "Metal & chrome polishing", "Non-skid deck cleaning"],
    meta: "Professional boat detailing services across Ontario",
  },
  "gelcoat-restoration": {
    title: "Gelcoat Restoration",
    description: "Restore faded, chalky, or damaged gelcoat to its original factory finish. Our multi-stage process delivers lasting results.",
    image: serviceDetailing,
    features: ["Multi-stage wet sanding", "Compound correction", "Gelcoat color matching", "UV protection coating", "Scratch & gouge repair", "Final high-gloss polish"],
    meta: "Expert gelcoat restoration for boats in Ontario",
  },
  "ceramic-coating": {
    title: "Ceramic Coating",
    description: "The ultimate in marine surface protection. Our ceramic coatings provide years of defense against UV, salt, and environmental damage.",
    image: serviceCeramic,
    features: ["Surface preparation & correction", "Marine-grade ceramic application", "9H hardness protection", "UV & salt resistance", "Self-cleaning properties", "Multi-year durability"],
    meta: "Marine ceramic coating services in Ontario",
  },
  "interior-detailing": {
    title: "Interior Detailing",
    description: "From helm to cabin, every surface is cleaned, conditioned, and protected with premium marine-grade products.",
    image: serviceInterior,
    features: ["Deep upholstery cleaning", "Leather conditioning", "Vinyl & fabric protection", "Teak oil treatment", "Mold & mildew remediation", "Odor elimination"],
    meta: "Interior boat detailing services in Ontario",
  },
  "wash-and-wax": {
    title: "Wash & Wax",
    description: "Our premium wash & wax service keeps your boat looking its best between full details. Quick, thorough, and convenient.",
    image: serviceDetailing,
    features: ["Full exterior hand wash", "Marine-grade wax application", "Window & glass cleaning", "Metal hardware polish", "Quick turnaround", "Dock-side service available"],
    meta: "Boat wash and wax services in Ontario",
  },
};

const ServicePage = () => {
  const { slug } = useParams();
  const service = serviceData[slug || ""] || serviceData["boat-detailing"];

  return (
    <Layout>
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-up">
              <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">Our Services</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{service.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">{service.description}</p>
              <ul className="space-y-3 mb-10">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-secondary-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex gap-4">
                <Button variant="hero" size="lg" asChild>
                  <Link to="/quote">Get a Quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <Button variant="heroOutline" size="lg" asChild>
                  <Link to="/booking">Book Now</Link>
                </Button>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-cyan">
              <img src={service.image} alt={service.title} className="w-full aspect-[4/3] object-cover" width={800} height={600} />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for a Transformation?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Get a personalized quote for {service.title.toLowerCase()} in just a few steps.</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/quote">Start Your Quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default ServicePage;
