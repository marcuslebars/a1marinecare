import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

const ConfirmationPage = () => (
  <Layout hideFooter>
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-lg text-center animate-fade-up">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-8 animate-pulse-glow">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Thank You!</h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Your request has been received. Our team will review your details and get back to you within 24 hours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" asChild>
            <Link to="/">Back to Home <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button variant="heroOutline" asChild>
            <Link to="/services/boat-detailing">View Services</Link>
          </Button>
        </div>
      </div>
    </div>
  </Layout>
);

export default ConfirmationPage;
