"use client";

import { useSession } from "@/context/SessionContext";
import Navbar from "@/components/layout/Navbar.jsx";
import Footer from "@/components/Footer";
import { FaCheck, FaInfoCircle, FaCoins } from "react-icons/fa";

const FEATURES = [
  {
    id: "basic",
    name: "Starter",
    credits: 100,
    price: "Free",
    description: "Perfect for testing custom prompts and exploring styles.",
  },
  {
    id: "standard",
    name: "Creator",
    credits: 250,
    price: "Free",
    description: "Ideal for regular creators wanting high resolution outputs.",
    popular: true,
  },
  {
    id: "pro",
    name: "Professional",
    credits: 600,
    price: "Free",
    description: "Designed for power users demanding batch exports and high speed.",
  },
  {
    id: "business",
    name: "Business",
    credits: 2000,
    price: "Free",
    description: "Maximum value pack for agency workflows and large volume generations.",
  },
];

export default function Pricing() {
  const { sessionId, credits } = useSession();

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page select-none text-primary-text overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col gap-10 overflow-y-auto scrollbar-subtle items-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-1">
            <FaInfoCircle className="text-primary text-xs" />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Credit System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">How Credits Work</h1>
          <p className="text-xs sm:text-sm text-secondary-text max-w-lg leading-relaxed">
            Generate professional logos using AI. Each generation costs credits based on resolution. No payment required — credits are provided for free.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 shadow-lg">
          <FaCoins className="text-amber-400 text-xl" />
          <div>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-wider">Your Credits</p>
            <p className="text-2xl font-black text-white">{credits}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {FEATURES.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-bg-card border rounded-lg p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                plan.popular ? "border-primary shadow-xl shadow-primary/5 scale-105" : "border-divider/50 shadow-md"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow">
                  Current Plan
                </span>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-primary-text">{plan.name}</h3>
                  <p className="text-2xl font-black tracking-tight text-white">{plan.price}</p>
                </div>

                <div className="text-xs bg-bg-page/50 border border-divider/30 p-3 rounded text-center font-extrabold text-primary">
                  {plan.credits} Art Credits
                </div>

                <p className="text-xs text-secondary-text leading-relaxed font-medium min-h-[3rem]">{plan.description}</p>

                <ul className="space-y-2 border-t border-divider/30 pt-4 text-xs font-semibold text-secondary-text">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>Dynamic aspect ratios</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>HD image downloads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-primary text-[10px]" />
                    <span>No subscription required</span>
                  </li>
                </ul>
              </div>

              <div className="text-xs text-center text-zinc-500 font-bold py-3 border-t border-zinc-800">
                {plan.popular ? "Active Session" : "Available Session"}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-zinc-500 max-w-2xl">
          <p>Credits are used to generate AI logos. Higher resolutions cost more credits. Your session persists locally in your browser.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
