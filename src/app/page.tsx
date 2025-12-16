import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, CreditCard, FileText, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              NexusProcure
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#workflows" className="text-muted-foreground hover:text-primary transition-colors">
              Workflows
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-primary/5">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-[100%] blur-3xl animate-in fade-in zoom-in duration-1000" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v2.0 Now Available
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Procurement Management <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                Reimagined
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Streamline your entire procurement lifecycle from Inter-Office Memos to Payment Requests with a modern, intelligent platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all">
                  Start Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base hover:bg-secondary/50">
                  View Features
                </Button>
              </Link>
            </div>

            {/* Hero Dashboard Preview (Abstract) */}
            <div className="mt-20 relative w-full max-w-5xl rounded-xl border bg-background/50 backdrop-blur shadow-2xl animate-in fade-in zoom-in duration-1000 delay-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-pink-500/5 rounded-xl pointer-events-none" />
              <div className="p-2 border-b flex items-center gap-2 px-4">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <div className="h-3 w-3 rounded-full bg-green-400/80" />
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
                <div className="space-y-4">
                  <div className="h-32 rounded-lg bg-muted/50 animate-pulse" />
                  <div className="h-8 w-3/4 rounded bg-muted/50 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div className="h-32 rounded-lg bg-muted/50 animate-pulse delay-75" />
                  <div className="h-8 w-3/4 rounded bg-muted/50 animate-pulse delay-75" />
                  <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse delay-75" />
                </div>
                <div className="space-y-4">
                  <div className="h-32 rounded-lg bg-muted/50 animate-pulse delay-150" />
                  <div className="h-8 w-3/4 rounded bg-muted/50 animate-pulse delay-150" />
                  <div className="h-4 w-1/2 rounded bg-muted/50 animate-pulse delay-150" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-secondary/30 relative">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Procurement Suite</h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to manage internal spending, from request to payment.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-background/50 border-white/10 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/5 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-indigo-500" />
                  </div>
                  <CardTitle className="text-xl">Inter-Office Memos</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Digitize your internal requests. Create drafts, attach documents, and route for approval seamlessly.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-white/10 hover:border-purple-500/30 transition-all hover:shadow-lg hover:shadow-purple-500/5 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                    <ShoppingCart className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle className="text-xl">Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Automatically convert approved IOMs into formal Purchase Orders sends to vendors. Track delivery status.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-white/10 hover:border-pink-500/30 transition-all hover:shadow-lg hover:shadow-pink-500/5 group">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4 group-hover:bg-pink-500/20 transition-colors">
                    <CreditCard className="h-6 w-6 text-pink-500" />
                  </div>
                  <CardTitle className="text-xl">Payment Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Process payments efficiently. Match invoices to POs and ensure financial compliance before disbursement.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Ready to optimize your workflow?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join the organization in moving towards a paperless, efficient future.
              </p>
              <Link href="/login">
                <Button size="lg" variant="default" className="h-14 px-10 text-lg rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300">
                  Access Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="font-semibold">NexusProcure</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NexusProcure. Internal Procurement System.
          </p>
        </div>
      </footer>
    </div>
  );
}
