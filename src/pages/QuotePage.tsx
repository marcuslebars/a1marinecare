import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check, Anchor } from "lucide-react";

const steps = [
  { id: 1, title: "Service", subtitle: "What does your boat need?" },
  { id: 2, title: "Boat Info", subtitle: "Tell us about your vessel" },
  { id: 3, title: "Location", subtitle: "Where is your boat?" },
  { id: 4, title: "Details", subtitle: "Almost there" },
];

const services = [
  { id: "detailing", label: "Boat Detailing", desc: "Full exterior restoration" },
  { id: "gelcoat", label: "Gelcoat Restoration", desc: "Fix faded or damaged gelcoat" },
  { id: "ceramic", label: "Ceramic Coating", desc: "Long-lasting protection" },
  { id: "interior", label: "Interior Detailing", desc: "Cabin & upholstery care" },
  { id: "wash", label: "Wash & Wax", desc: "Quick refresh & protection" },
];

const boatSizes = ["Under 20ft", "20–30ft", "30–40ft", "40–50ft", "50ft+"];
const locations = ["Georgian Bay", "Muskoka", "Lake Simcoe", "Midland", "Barrie", "Other"];

const QuotePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [boatSize, setBoatSize] = useState("");
  const [boatType, setBoatType] = useState("");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return selectedServices.length > 0;
      case 2: return boatSize && boatType;
      case 3: return location;
      case 4: return name && email;
      default: return false;
    }
  };

  const handleSubmit = () => {
    navigate("/confirmation");
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Progress */}
        <div className="border-b border-border/50 bg-card/30">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                    step > s.id ? "bg-primary text-primary-foreground" :
                    step === s.id ? "bg-primary text-primary-foreground animate-pulse-glow" :
                    "border border-border text-muted-foreground"
                  }`}>
                    {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:block ${step >= s.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.title}
                  </span>
                  {i < steps.length - 1 && (
                    <div className={`w-12 md:w-20 h-px mx-3 ${step > s.id ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center">
          <div className="container mx-auto px-4 py-12 max-w-2xl">
            <div className="animate-fade-up" key={step}>
              <h2 className="text-3xl font-bold mb-2">{steps[step - 1].subtitle}</h2>
              <div className="glow-line mb-8" />

              {step === 1 && (
                <div className="grid gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s.id)}
                      className={`flex items-center gap-4 p-5 rounded-xl border text-left transition-all duration-300 ${
                        selectedServices.includes(s.id)
                          ? "border-primary bg-primary/10 shadow-cyan"
                          : "border-border/50 bg-card-gradient hover:border-primary/30"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedServices.includes(s.id) ? "border-primary bg-primary" : "border-muted-foreground"
                      }`}>
                        {selectedServices.includes(s.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{s.label}</div>
                        <div className="text-sm text-muted-foreground">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">Boat Size</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {boatSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setBoatSize(size)}
                          className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                            boatSize === size
                              ? "border-primary bg-primary/10 text-foreground shadow-cyan"
                              : "border-border/50 bg-card-gradient text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">Boat Type</label>
                    <input
                      type="text"
                      value={boatType}
                      onChange={(e) => setBoatType(e.target.value)}
                      placeholder="e.g., Bowrider, Pontoon, Cruiser..."
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-2 gap-3">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setLocation(loc)}
                      className={`p-5 rounded-xl border text-left transition-all ${
                        location === loc
                          ? "border-primary bg-primary/10 shadow-cyan"
                          : "border-border/50 bg-card-gradient hover:border-primary/30"
                      }`}
                    >
                      <Anchor className={`h-5 w-5 mb-2 ${location === loc ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-semibold text-foreground text-sm">{loc}</div>
                    </button>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Name *</label>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Phone</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(705) 555-0123"
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Additional Notes</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any details about your boat's condition..."
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-10">
              {step > 1 ? (
                <Button variant="heroOutline" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              ) : <div />}
              {step < 4 ? (
                <Button variant="hero" onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="hero" onClick={handleSubmit} disabled={!canProceed()}>
                  Submit Quote Request <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default QuotePage;
