import styles from "./Homepage.module.css";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Sessions } from "./Sessions";
import { Modes } from "./Modes";
import { WhyItWorks } from "./WhyItWorks";
import { Stats } from "./Stats";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";

export function Homepage() {
  return (
    <div className={styles.root}>
      <Nav />
      <main>
        <Hero />
        <Sessions />
        <Modes />
        <WhyItWorks />
        <Stats />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
