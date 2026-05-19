import styles from "./Homepage.module.css";
import { Hero } from "./Hero";
import { Sessions } from "./Sessions";
import { Modes } from "./Modes";
import { WhyItWorks } from "./WhyItWorks";
import { Faq } from "./Faq";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";
import Navbar from "@/components/navbar/navbar";

export function Homepage() {
  return (
    <div className={styles.root}>
      <Navbar marketingHome />
      <main>
        <Hero />
        <Sessions />
        <Modes />
        <WhyItWorks />
        <Faq />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
