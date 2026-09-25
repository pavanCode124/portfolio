import BootLoader from '@/components/BootLoader';
import Cursor from '@/components/Cursor';
import Experience from '@/components/Experience';
import AiCoreBackground from '@/components/AiCoreBackground';
import TechHud from '@/components/TechHud';
import About from '@/components/ui/About';
import Contact from '@/components/ui/Contact';
import Hero from '@/components/ui/Hero';
import Nav from '@/components/ui/Nav';
import ProjectModal from '@/components/ui/ProjectModal';
import Projects from '@/components/ui/Projects';
import { RevealObserver } from '@/components/ui/Primitives';
import Skills from '@/components/ui/Skills';

export default function Home() {
  return (
    <>
      <AiCoreBackground />
      <TechHud />
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Experience />
      <ProjectModal />
      <Cursor />
      <BootLoader />
      <RevealObserver />
    </>
  );
}
