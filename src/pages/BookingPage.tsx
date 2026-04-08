import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ArrowRight, ArrowLeft, Clock, Check } from "lucide-react";

const timeSlots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

const BookingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleBook = () => {
    navigate("/confirmation");
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/30">
          <div className="container mx-auto px-4 py-6 text-center">
            <p className="text-primary font-medium tracking-widest uppercase text-sm mb-1">Book a Service</p>
            <h1 className="text-2xl font-bold">
              {step === 1 ? "Select a Date & Time" : "Your Information"}
            </h1>
          </div>
        </div>

        <div className="flex-1 flex items-center">
          <div className="container mx-auto px-4 py-12 max-w-3xl">
            <div className="animate-fade-up" key={step}>
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date() || d.getDay() === 0}
                      className="rounded-xl border border-border/50 bg-card-gradient p-4 pointer-events-auto"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Available Times
                    </h3>
                    {date ? (
                      <div className="grid grid-cols-2 gap-3">
                        {timeSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => setTime(t)}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                              time === t
                                ? "border-primary bg-primary/10 text-foreground shadow-cyan"
                                : "border-border/50 bg-card-gradient text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a date to see available times.</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Email *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Phone</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(705) 555-0123"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors" />
                  </div>

                  <div className="p-5 rounded-xl border border-border/50 bg-card-gradient mt-6">
                    <h3 className="font-semibold text-foreground mb-3">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-foreground">{date?.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="text-foreground">{time}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-10 max-w-md mx-auto">
              {step > 1 ? (
                <Button variant="heroOutline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              ) : <div />}
              {step === 1 ? (
                <Button variant="hero" onClick={() => setStep(2)} disabled={!date || !time}>
                  Continue <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button variant="hero" onClick={handleBook} disabled={!name || !email}>
                  Confirm Booking <Check className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BookingPage;
