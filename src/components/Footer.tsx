import { Link } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

const services = [
  { label: "Boat Detailing", href: "/services/boat-detailing" },
  { label: "Gelcoat Restoration", href: "/services/gelcoat-restoration" },
  { label: "Ceramic Coating", href: "/services/ceramic-coating" },
  { label: "Interior Detailing", href: "/services/interior-detailing" },
  { label: "Wash & Wax", href: "/services/wash-and-wax" },
];

const locations = [
  { label: "Georgian Bay", href: "/locations/georgian-bay" },
  { label: "Muskoka", href: "/locations/muskoka" },
  { label: "Lake Simcoe", href: "/locations/lake-simcoe" },
  { label: "Midland", href: "/locations/midland" },
  { label: "Barrie", href: "/locations/barrie" },
];

const Footer = () => (
  <footer className="border-t border-border/50 bg-card/50">
    <div className="container mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <div className="flex items-center">
            <img src={logo} alt="A1 Marine Care" className="h-8" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premium marine detailing services across Ontario's finest waterways.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> (705) 555-0123</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> info@a1marinecare.ca</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Ontario, Canada</div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Services</h4>
          <ul className="space-y-2">
            {services.map((s) => (
              <li key={s.href}>
                <Link to={s.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{s.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Locations</h4>
          <ul className="space-y-2">
            {locations.map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-2">
            <li><Link to="/quote" className="text-sm text-muted-foreground hover:text-primary transition-colors">Get a Quote</Link></li>
            <li><Link to="/booking" className="text-sm text-muted-foreground hover:text-primary transition-colors">Book a Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="glow-line mt-12 mb-6" />
      <p className="text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} A1 Marine Care. All rights reserved. Premium marine detailing across Ontario.
      </p>
    </div>
  </footer>
);

export default Footer;
