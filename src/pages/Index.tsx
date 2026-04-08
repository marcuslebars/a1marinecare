import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Star, Droplets, Sparkles, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-marine.jpg";
import serviceDetailing from "@/assets/service-detailing.jpg";
import serviceCeramic from "@/assets/service-ceramic.jpg";
import serviceInterior from "@/assets/service-interior.jpg";

const services = [
  {
    title: "Boat Detailing",
    description: "Complete exterior restoration to showroom condition.",
    image: serviceDetailing,
    href: "/services/boat-detailing",
    icon: Droplets,
  },
  {
    title: "Ceramic Coating",
    description: "Long-lasting protection with a deep, glossy finish.",
    image: serviceCeramic,
    href: "/services/ceramic-coating",
    icon: Shield,
  },
  {
    title: "Interior Detailing",
    description: "Meticulous interior care from helm to cabin.",
    image: serviceInterior,
    href: "/services/interior-detailing",
    icon: Sparkles,
  },
];

const locations = [
  { name: "Georgian Bay", href: "/locations/georgian-bay" },
  { name: "Muskoka", href: "/locations/muskoka" },
  { name: "Lake Simcoe", href: "/locations/lake-simcoe" },
  { name: "Midland", href: "/locations/midland" },
  { name: "Barrie", href: "/locations/barrie" },
];

const stats = [
  { value: "500+", label: "Boats Detailed" },
  { value: "15+", label: "Years Experience" },
  { value: "5", label: "Regions Served" },
  { value: "100%", label: "Satisfaction" },
];

const Index = () => (
  <Layout>
    {/* Hero */}
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Luxury yacht on calm water at twilight" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      <div className="relative container mx-auto px-4 text-center max-w-4xl animate-fade-up">
        <p className="text-primary font-medium tracking-widest uppercase text-sm mb-4">Premium Marine Detailing</p>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          Your Boat Deserves <br />
          <span className="text-gradient-cyan">The Best Care</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Professional detailing, ceramic coating, and restoration services for Ontario's finest vessels.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/quote">Get Your Free Quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link to="/services/boat-detailing">Explore Services</Link>
          </Button>
        </div>
      </div>
    </section>

    {/* Stats */}
    <section className="border-y border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-gradient-cyan">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Services */}
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">What We Do</p>
        <h2 className="text-3xl md:text-5xl font-bold">Our Services</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {services.map((service) => (
          <Link
            key={service.href}
            to={service.href}
            className="group relative rounded-xl overflow-hidden border border-border/50 bg-card-gradient hover:border-primary/30 transition-all duration-500 hover:shadow-cyan"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                width={800}
                height={600}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
            </div>
            <div className="relative p-6">
              <service.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">{service.title}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
              <div className="mt-4 flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                Learn More <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>

    {/* Locations */}
    <section className="bg-card/30 border-y border-border/50">
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">Service Areas</p>
          <h2 className="text-3xl md:text-5xl font-bold">Where We Operate</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {locations.map((loc) => (
            <Link
              key={loc.href}
              to={loc.href}
              className="group flex items-center gap-3 p-5 rounded-xl border border-border/50 bg-card-gradient hover:border-primary/40 transition-all duration-300 hover:shadow-cyan"
            >
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium text-foreground text-sm">{loc.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* Trust */}
    <section className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <p className="text-primary font-medium tracking-widest uppercase text-sm mb-3">Why Choose Us</p>
        <h2 className="text-3xl md:text-5xl font-bold">The A1 Difference</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Shield, title: "Certified Professionals", desc: "Factory-trained technicians with marine-specific expertise and certifications." },
          { icon: Star, title: "Premium Products Only", desc: "We use only the highest-grade marine coatings and detailing products available." },
          { icon: Sparkles, title: "Guaranteed Results", desc: "Every job backed by our satisfaction guarantee. Your boat, our reputation." },
        ].map((item) => (
          <div key={item.title} className="text-center p-8 rounded-xl border border-border/50 bg-card-gradient">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-5">
              <item.icon className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-3 text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* CTA */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
      <div className="container mx-auto px-4 py-24 text-center relative">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
          Get a personalized quote in minutes or book your service today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/quote">Get Your Free Quote <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link to="/booking">Book a Service</Link>
          </Button>
        </div>
      </div>
    </section>
  </Layout>
);

export default Index;
